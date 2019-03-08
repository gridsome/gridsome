const path = require('path')
const App = require('../../app/App')
const { graphql } = require('graphql')
const createSchema = require('../createSchema')
const PluginAPI = require('../../app/PluginAPI')

const context = path.resolve(__dirname, '../../__tests__')
const imagesDir = path.join(context, 'assets', 'static')
const filesDir = path.join(context, 'assets', 'files')
const pathPrefix = '/'

let app, api

beforeEach(() => {
  app = new App(context, {
    config: {
      plugins: [],
      pathPrefix,
      imagesDir,
      filesDir,
      outDir: context,
      imageExtensions: ['.png'],
      maxImageWidth: 1000
    }
  }).init()

  api = new PluginAPI(app, {
    entry: { options: {}, clientOptions: undefined }
  })
})

afterAll(() => {
  app = null
  api = null
})

test('add meta data', async () => {
  api.store.addMetaData('myValue', {
    test: 'Test Value',
    image: path.join(context, 'assets', '350x250.png'),
    file: path.join(context, 'assets', 'dummy.pdf')
  })

  api.store.addMetaData('myValue', {
    object: {
      list: ['one', 'two', 'three'],
      value: 1000
    }
  })

  api.store.addMetaData('myList', [
    {
      name: 'Etiam Nibh',
      description: 'Sociis natoque penatibus.'
    },
    {
      name: 'Tellus Ultricies Cursus',
      description: 'Nascetur ridiculus mus.'
    }
  ])

  api.store.addMetaData('myList', [
    {
      name: 'Vulputate Magna',
      description: 'Cras justo odio.'
    }
  ])

  api.store.addMetaData('myOtherValue', 'Value')

  api.store.addMetaData('overrideValue', 'Value 1')
  api.store.addMetaData('overrideValue', 'Value 2')

  const query = `{
    metaData {
      myValue {
        test
        image
        file
        object {
          list
          value
        }
      }
      myOtherValue
      overrideValue
      myList {
        name
        description
      }
    }
  }`

  const { errors, data } = await createSchemaAndExecute(query)

  expect(errors).toBeUndefined()
  expect(data.metaData.myValue.test).toEqual('Test Value')
  expect(data.metaData.myValue.image.src).toEqual('/assets/static/350x250.5c1e01e.test.png')
  expect(data.metaData.myValue.file.src).toEqual('/assets/files/dummy.pdf')
  expect(data.metaData.myValue.object.list).toHaveLength(3)
  expect(data.metaData.myValue.object.value).toEqual(1000)
  expect(data.metaData.myOtherValue).toEqual('Value')
  expect(data.metaData.overrideValue).toEqual('Value 2')
  expect(data.metaData.myList).toHaveLength(3)
  expect(data.metaData.myList[0]).toMatchObject({
    name: 'Etiam Nibh',
    description: 'Sociis natoque penatibus.'
  })
  expect(data.metaData.myList[1]).toMatchObject({
    name: 'Tellus Ultricies Cursus',
    description: 'Nascetur ridiculus mus.'
  })
  expect(data.metaData.myList[2]).toMatchObject({
    name: 'Vulputate Magna',
    description: 'Cras justo odio.'
  })
})

async function createSchemaAndExecute (query) {
  const schema = createSchema(app.store)
  const context = app.createSchemaContext()
  return graphql(schema, query, undefined, context)
}
