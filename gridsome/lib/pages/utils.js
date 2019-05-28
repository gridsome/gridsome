exports.createQueryVariables = function (page, currentPage = undefined) {
  return {
    ...page.query.variables,
    page: currentPage,
    __path: page.path
  }
}
