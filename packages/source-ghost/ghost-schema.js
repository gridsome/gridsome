const GhostAuthor = ({ author }) => `type ${author} implements Node {
  id: ID!
  name: String
  slug: String
  profile_image: String
  cover_image: String
  bio: String
  website: String
  location: String
  facebook: String
  twitter: String
  meta_title: String
  meta_description: String
  url: String
  postCount: Int
}`
const GhostTag = ({ tag }) => `type ${tag} implements Node {
  id: ID!
  name: String
  slug: String
  description: String
  feature_image: String
  ghostId: String
  meta_description: String
  meta_title: String
  postCount: Int
  url: String
  visibility: String
}`
const GhostPost = ({ post, author, tag }) => `type ${post} implements Node {
  id: ID!
  uuid: String
  title: String
  slug: String
  html: String
  comment_id: String
  plaintext: String
  feature_image: String
  featured: Boolean
  created_at: Date
  updated_at: Date
  published_at: Date
  custom_excerpt: String
  codeinjection_head: String
  codeinjection_foot: String
  tags: [${tag}]
  authors: [${author}]
  primary_author: ${author}
  primary_tag: ${tag}
  url: String
  page: Boolean
  excerpt: String
  reading_time: Int
  og_image: String
  og_title: String
  og_description: String
  twitter_image: String
  twitter_title: String
  twitter_description: String
  meta_title: String
  meta_description: String
  ghostId: String
  mobiledoc: String
  codeinjection_styles: String
}`
const GhostPage = ({ page, author, tag }) => `type ${page} implements Node {
  id: ID!
  uuid: String
  title: String
  slug: String
  url: String
  mobiledoc: String
  html: String
  comment_id: String
  plaintext: String
  feature_image: String
  featured: Boolean
  page: Boolean
  meta_title: String
  meta_description: String
  created_at: Date
  updated_at: Date
  published_at: Date
  custom_excerpt: String
  excerpt: String
  codeinjection_head: String
  codeinjection_foot: String
  codeinjection_styles: String
  og_image: String
  og_title: String
  og_description: String
  twitter_image: String
  twitter_title: String
  twitter_description: String
  custom_template: String
  primary_author: ${author}
  primary_tag: ${tag}
  authors: [${author}]
  tags: [${tag}]
  ghostId: String
}`

module.exports = {
  GhostAuthor,
  GhostTag,
  GhostPost,
  GhostPage
}
