# Yaml transformer

```yaml
graphql:
  connection: allWordPressPost
  options:
    path: blog/:slug
  fields:
    title: true
    created:
      format: YYYY
sources:
  a7gk32l1n76:
    connection: allWordPressPost
      fields:
        title: true
        link: true
```

```json
{
  "graphql": {
    "query": "...",
    "options": {
      "path": "blog/:slug"
    }
  }
}
```
