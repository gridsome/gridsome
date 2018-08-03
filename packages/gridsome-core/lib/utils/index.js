exports.ucfirst = string => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

exports.unslash = (string) => {
  return string.replace(/^\/+/g, '')
}

exports.slugify = string => {
  return string.toString().toLowerCase()
    .replace(/\s+/g, '-')     // replace spaces with -
    .replace(/[^\w\-]+/g, '') // remove all non-word chars
    .replace(/\-\-+/g, '-')   // replace multiple - with single
    .replace(/^-+/, '')       // trim start
    .replace(/-+$/, '')       // trim end
}

exports.findAll = store => new Promise((resolve, reject) => {
  store.find({}, (err, results) => err ? reject(err) : resolve(results))
})
