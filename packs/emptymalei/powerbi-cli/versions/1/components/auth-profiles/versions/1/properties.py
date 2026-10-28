"""Behavioural properties for emptymalei/auth-profiles."""

import json

from hypothesis import assume, given, strategies as st

from schema import Input

CONFIG = ".pbi_cli/config.yaml"
CREDS = ".pbi_cli/credentials.json"
NAMES = ["a", "b", "c", "default"]
GROUPS = ["user", "admin"]


@st.composite
def states(draw):
    def profiles():
        names = draw(st.lists(st.sampled_from(NAMES), unique=True, max_size=4))
        return names, draw(st.sampled_from([None, *names]))

    creds = draw(st.lists(st.sampled_from(NAMES), unique=True, max_size=4))
    return {"flat": profiles(), "user": profiles(), "admin": profiles(), "creds": {n: f"tok-{n}" for n in creds}}


def config_dict(state):
    def block(key):
        names, active = state[key]
        return {"active_profile": active, "profiles": {n: {"name": n} for n in names}}

    return {**block("flat"), "groups": {"user": block("user"), "admin": block("admin")}, "default_output_folder": None, "cache_folder": None, "cache_enabled": True}


def dump(value, indent=0):
    out = ""
    for key, v in value.items():
        pad = " " * indent
        if isinstance(v, dict) and v:
            out += f"{pad}{key}:\n" + dump(v, indent + 2)
        elif isinstance(v, dict):
            out += f"{pad}{key}: {{}}\n"
        else:
            out += f"{pad}{key}: {'null' if v is None else str(v).lower() if isinstance(v, bool) else v}\n"
    return out


def seed(state):
    return {CONFIG: dump(config_dict(state)), CREDS: json.dumps(state["creds"], indent=2)}


def run(impl, state, argv, stdin=None, extra=None):
    return impl(Input(argv=argv, files={**seed(state), **(extra or {})}, stdin=stdin))


def config_after(out, state):
    # A file written with the content it already had is not reported as changed.
    return out.files.get(CONFIG, config_dict(state))


def where(group):
    return f" in group '{group}'" if group else ""


@given(states(), st.sampled_from(NAMES), st.none() | st.sampled_from(GROUPS), st.booleans())
def test_auth_saves_the_token_and_activates_the_profile_when_none_is(impl, state, profile, group, bearer):
    argv = ["auth", "-t", ("Bearer " if bearer else "") + "tok-new", "-p", profile] + (["-g", group] if group else [])
    out = run(impl, state, argv)
    expected = config_dict(state)
    target = expected if group is None else expected["groups"][group]
    target["profiles"][profile] = {"name": profile}
    if not target["active_profile"] or (group is None and profile == "default"):
        target["active_profile"] = profile
    assert out.exit_code == 0
    assert config_after(out, state) == expected
    assert out.files.get(CREDS, state["creds"]) == {**state["creds"], profile: "tok-new"}
    lines = [f"✓ Credentials saved securely for profile '{profile}'{where(group)}"]
    if target["active_profile"] == profile:
        lines.append(f"✓ Profile '{profile}' is now active{where(group)}")
    assert out.stdout == "\n".join(lines)


@given(states(), st.sampled_from(NAMES + ["zz"]), st.none() | st.sampled_from(GROUPS))
def test_switch_changes_only_the_active_profile(impl, state, name, group):
    names, _ = state[group or "flat"]
    out = run(impl, state, ["profile", "switch", name] + (["-g", group] if group else []))
    assert out.exit_code == 0 and out.errors == []
    if not names:
        assert out.files == {}
        assert out.stdout == (f"No profiles found in group '{group}'. Use 'pbi auth -g {group}' to create a profile." if group else "No profiles found. Use 'pbi auth' to create a profile.")
    elif name not in names:
        assert out.files == {}
        assert out.stdout == (f"Profile '{name}' not found in group '{group}'. " if group else f"Profile '{name}' not found. ") + "Use 'pbi profile list' to see available profiles."
    else:
        expected = config_dict(state)
        (expected if group is None else expected["groups"][group])["active_profile"] = name
        assert config_after(out, state) == expected
        assert CREDS not in out.files
        assert out.stdout == f"✓ Switched to profile '{name}'{where(group)}"


@given(states(), st.sampled_from(NAMES + ["zz"]), st.none() | st.sampled_from(GROUPS))
def test_delete_removes_the_profile_and_its_token_and_promotes_the_first_remaining(impl, state, name, group):
    names, active = state[group or "flat"]
    out = run(impl, state, ["profile", "delete", name, "--yes"] + (["-g", group] if group else []))
    assert out.exit_code == 0 and out.errors == []
    if name not in names:
        assert out.files == {}
        assert out.stdout == (f"Profile '{name}' not found in group '{group}'. " if group else f"Profile '{name}' not found. ") + "Use 'pbi profile list' to see available profiles."
        return
    remaining = [n for n in names if n != name]
    new_active = active if active != name else (remaining[0] if remaining else None)
    expected = config_dict(state)
    target = expected if group is None else expected["groups"][group]
    target["profiles"] = {n: {"name": n} for n in remaining}
    target["active_profile"] = new_active
    assert config_after(out, state) == expected
    assert out.files.get(CREDS, state["creds"]) == {k: v for k, v in state["creds"].items() if k != name}
    lines = [f"✓ Profile '{name}' deleted from group '{group}'" if group else f"✓ Profile '{name}' deleted successfully"]
    if new_active:
        lines.append(f"Active profile in group '{group}' is now '{new_active}'" if group else f"Active profile is now '{new_active}'")
    assert out.stdout == "\n".join(lines)


@given(states())
def test_list_shows_ungrouped_then_each_group_with_token_marks(impl, state):
    out = run(impl, state, ["profile", "list"])
    assert out.exit_code == 0 and out.files == {}

    def entries(names, active):
        return [f"  {'✓' if n in state['creds'] else '✗'} {n}{' (active)' if n == active else ''}" for n in names]

    flat, flat_active = state["flat"]
    lines = (["Stored authentication profiles (ungrouped):", *entries(flat, flat_active), "", f"Active profile: {flat_active or 'None'}"] if flat
             else ["No ungrouped profiles found. Use 'pbi auth' to create a profile."]) + [""]
    for group in GROUPS:
        names, active = state[group]
        lines += ([f"Group '{group}':", *entries(names, active), f"  Active: {active or 'None'}"] if names
                  else [f"No profiles found in group '{group}'. Use 'pbi auth -g {group}' to create one."])
    if not flat and not any(state[g][0] for g in GROUPS):
        lines.append("No profiles found. Use 'pbi auth' to create a profile.")
    assert out.stdout == "\n".join(lines)


def resolution_error(state, group):
    names, active = state[group]
    if active in names:
        profile = active
    else:
        flat, flat_active = state["flat"]
        if flat_active is None:
            return f"Error: No active profile set for group '{group}'. Use 'pbi auth -g {group}' to create a profile or 'pbi profile switch -g {group}' to switch profiles."
        if flat_active not in flat:
            return f"Error: Profile '{flat_active}' not found in group '{group}' or flat profiles. Use 'pbi profile list' to see available profiles."
        profile = flat_active
    return None if profile in state["creds"] else f"Error: No credentials found for profile '{profile}'. Please re-authenticate."


@given(states())
def test_user_commands_take_the_user_groups_profile_else_the_ungrouped_one(impl, state):
    out = run(impl, state, ["apps", "augment", "-s", "e.json", "-t", "o.json"], extra={"e.json": '{"value": []}'})
    error = resolution_error(state, "user")
    if error is None:
        assert out.exit_code == 0 and out.errors == [] and out.files == {"o.json": []}
    else:
        assert out.exit_code == 1 and out.errors == [error] and out.files == {}


@given(states())
def test_admin_commands_fail_the_same_way_naming_the_admin_group(impl, state):
    error = resolution_error(state, "admin")
    assume(error is not None)
    out = run(impl, state, ["workspaces", "list"])
    assert out.exit_code == 1 and out.errors == [error] and out.files == {}
