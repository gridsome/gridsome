const path = require('path')
const fs = require('fs-extra')
const execa = require('execa')
const getStream = require('get-stream')
const lerna = require.resolve('lerna/cli')
const conventionalChangelog = require('conventional-changelog')
const makeBumpOnlyFilter = require('@lerna/conventional-commits/lib/make-bump-only-filter')
const readExistingChangelog = require('@lerna/conventional-commits/lib/read-existing-changelog')

const {
  EOL,
  BLANK_LINE,
  CHANGELOG_HEADER
} = require('@lerna/conventional-commits/lib/constants')

const resolve = (...p) => path.resolve(__dirname, '..', ...p)

async function run () {
  const { stdout: packagesList } = await execa(lerna, ['ls'])
  const { stdout: tagsList } = await execa('git', [
    'tag', '-l', '--format', '%(refname:short)|%(taggerdate:short)'
  ])

  const allTags = tagsList.split('\n').map(string => {
    const [name, date] = string.split('|')
    const version = name.charAt(0) === 'v'
      ? name.substring(1)
      : name.split('@').pop()

    return { name, date, version }
  })

  const packages = packagesList.split('\n').map(name => {
    const dirname = /@gridsome/.test(name)
      ? name.replace(/@gridsome/, 'packages')
      : 'gridsome'

    const tags = allTags.slice().reverse().filter(tag => {
      return tag.name.startsWith(name)
    })

    // v0.0.1 tag
    tags.push({
      name: '142896c2454016dc989a7872faffec7263fc658c',
      date: '2018-09-16',
      version: '0.0.1'
    })

    return {
      name,
      tags,
      dirname,
      location: resolve(dirname),
      changelog: resolve(dirname, 'CHANGELOG.md')
    }
  })

  for (const pkg of packages) {
    await genChangelogs(pkg)
  }
}

async function genChangelogs (pkg) {
  console.log(`Generating changelog for ${pkg.name}`)

  for (let i = 0; i < pkg.tags.length - 1; i++) {
    await genChangelog(pkg, i)
  }
}

function genChangelog (pkg, i) {
  return new Promise((resolve, reject) => {
    const { name: to, date, version } = pkg.tags[i]
    const from = pkg.tags[i + 1].name
    const path = pkg.dirname
    const previousTag = from
    const currentTag = to

    const stream = conventionalChangelog(
      {
        preset: 'angular',
        lernaPackage: pkg.name
      },
      {
        version,
        date,
        previousTag,
        currentTag
      },
      {
        path,
        from,
        to
      }
    )

    Promise.all([
      getStream(stream).then(makeBumpOnlyFilter(pkg)),
      readExistingChangelog(pkg)
    ]).then(([newEntry, [changelogFileLoc, changelogContents]]) => {
      if (i === 0) changelogContents = ''

      const content = [
        CHANGELOG_HEADER,
        changelogContents,
        newEntry
      ].join(BLANK_LINE).trim()

      fs.writeFile(changelogFileLoc, content + EOL).then(() => {
        resolve()
      })
    })

    return stream
  })
}

run().catch(err => {
  console.error(err)
  process.exitCode = 1
})
