"""Behavioural properties for emptymalei/flatten."""

from hypothesis import given, strategies as st

from schema import Input

SCALARS = st.one_of(st.none(), st.booleans(), st.integers(-5, 5), st.text(alphabet="abc XYZ-", max_size=6))
VALUES = st.one_of(SCALARS, st.dictionaries(st.sampled_from(["k", "j"]), SCALARS, max_size=2))
OWN_KEYS = ["id", "name", "state", "type", "meta", "isReadOnly"]
CHILD_KEYS = ["id", "name", "role", "email", "meta"]
WORKSPACE_CHILDREN = ["users", "reports", "dashboards", "datasets", "dataflows", "workbooks"]
APP_CHILDREN = ["users", "reports", "dashboards"]

children = st.lists(st.dictionaries(st.sampled_from(CHILD_KEYS), VALUES, min_size=1, max_size=4), max_size=3)


def parent(child_kinds, extra_lists):
    return st.fixed_dictionaries(
        {},
        optional={**{k: VALUES for k in OWN_KEYS}, **{k: children for k in child_kinds}, **{k: children for k in extra_lists}},
    )


def own(p):
    return {k: v for k, v in p.items() if not isinstance(v, list)}


def rows_of(p, child):
    return [{**own(p), **{f"{child}_{k}": v for k, v in c.items()}} for c in p.get(child, [])]


def items(rows):
    return [list(r.items()) for r in rows]


@given(st.lists(parent(WORKSPACE_CHILDREN, ["tags", "extras"]), min_size=1, max_size=4))
def test_workspaces_one_row_per_child_repeating_the_workspace_fields(impl, workspaces):
    sheets = impl(Input(kind="workspaces", data=workspaces)).sheets
    assert list(sheets) == WORKSPACE_CHILDREN + ["workspace"]
    for child in WORKSPACE_CHILDREN:
        assert items(sheets[child]) == items([r for w in workspaces for r in rows_of(w, child)])
    assert items(sheets["workspace"]) == items([own(w) for w in workspaces])


@given(parent(APP_CHILDREN, ["tags"]))
def test_app_one_row_per_child_repeating_the_app_fields(impl, app):
    sheets = impl(Input(kind="app", data=app)).sheets
    assert list(sheets) == APP_CHILDREN + ["app"]
    for child in APP_CHILDREN:
        assert items(sheets[child]) == items(rows_of(app, child))
    assert items(sheets["app"]) == items([own(app)])


report = st.fixed_dictionaries(
    {"reports_users_value": children},
    optional={"reports_id": st.text(alphabet="abc12", max_size=3), "reports_name": st.text(alphabet="abc ", max_size=4), "type": SCALARS},
)


@given(st.dictionaries(st.text(alphabet="WXYZ ", min_size=1, max_size=3), st.lists(report, max_size=3), max_size=3))
def test_report_users_one_row_per_user_of_each_report(impl, data):
    sheets = impl(Input(kind="report_users", data=data)).sheets
    assert list(sheets) == list(data)
    for name, reports in data.items():
        expected = [
            {**{k: v for k, v in r.items() if k != "reports_users_value"}, **{f"reports_users_value_{k}": v for k, v in u.items()}}
            for r in reports
            for u in r["reports_users_value"]
        ]
        assert items(sheets[name]) == items(expected)


@given(st.lists(st.dictionaries(st.sampled_from(["id", "role"]), st.integers(0, 3), min_size=1), max_size=3))
def test_report_users_custom_key(impl, users):
    sheets = impl(Input(kind="report_users", key="members", data={"W": [{"rid": 1, "members": users}]})).sheets
    assert items(sheets["W"]) == items([{"rid": 1, **{f"members_{k}": v for k, v in u.items()}} for u in users])
