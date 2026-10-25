# Publisher profiles

`<owner>.toml` holds a publisher's live profile, shown on their pack pages at
symbola.sh. It is written by the account page through the publish workflow and
wins over `[publisher]` in a pack's manifest:

```toml
name = "Acme Labs"
url = "https://acme.example"
bio = "At most 280 characters."
support = [
  { label = "Ko-fi", url = "https://ko-fi.com/acme" },
]
```
