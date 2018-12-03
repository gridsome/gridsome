module.exports = {
  DEFAULT_ENTITIES: [
    'node',
    'taxonomy_term',
    'file',
    'user'
  ],
  DEFAULT_EXCLUDES: [
    'self',
    // 'block--block',
    // 'block_content--basic',
    // 'block_content_type--block_content_type',
    // 'comment_type--comment_type',
    // 'comment--comment',
    'contact_form--contact_form',
    'contact_message--feedback',
    'contact_message--personal',
    'editor--editor',
    'field_storage_config--field_storage_config',
    'field_config--field_config',
    // 'file--file',
    'filter_format--filter_format',
    // 'image_style--image_style',
    // 'node_type--node_type',
    // 'node--article',
    // 'node--page',
    'rdf_mapping--rdf_mapping',
    'rest_resource_config--rest_resource_config',
    'search_page--search_page',
    'shortcut--default',
    'shortcut_set--shortcut_set',
    // 'menu--menu',
    'action--action',
    // 'taxonomy_term--category',
    // 'taxonomy_term--tags',
    // 'taxonomy_vocabulary--taxonomy_vocabulary',
    'tour--tour', // this response seems to break graphql server
    // 'user--user',
    'user_role--user_role',
    // 'menu_link_content--menu_link_content',
    'view--view', // this response seems to break graphql server
    'date_format--date_format',
    'base_field_override--base_field_override',
    'entity_form_mode--entity_form_mode',
    'entity_view_mode--entity_view_mode',
    'entity_view_display--entity_view_display',
    'entity_form_display--entity_form_display'
  ]
}
