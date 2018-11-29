const toPascalCase = (text) => {
  return text.match(/[a-z]+/gi)
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
    })
    .join('')
}

const cullByWordCount = (str) => {
  if (!str) return () => ''
  
  return (wordCount) => {
    let strArray = str.split(' ')
    let innerWordCount = (strArray.length < wordCount) ? strArray.length : wordCount


    return strArray.slice(0, innerWordCount).join(' ')
  }
}

module.exports = {
  toPascalCase,
  cullByWordCount
}
