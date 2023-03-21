const path = require('path')
const App = require('../../app/App')
const PluginAPI = require('../../app/PluginAPI')

const context = path.resolve(__dirname, '../../__tests__')
const imagesDir = path.join(context, 'assets', 'static')
const filesDir = path.join(context, 'assets', 'files')
const pathPrefix = '/'

let app, api

beforeEach(async () => {
  app = await new App(context, {
    config: {
      plugins: [],
      pathPrefix,
      imagesDir,
      filesDir,
      outputDir: context,
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
  api.store.addMetadata('myValue', {
    test: 'Test Value',
    image: path.join(context, 'assets', '350x250.png'),
    file: path.join(context, 'assets', 'dummy.pdf')
  })

  api.store.addMetadata('myValue', {
    object: {
      list: ['one', 'two', 'three'],
      value: 1000
    }
  })

  api.store.addMetadata('myList', [
    {
      name: 'Etiam Nibh',
      description: 'Sociis natoque penatibus.'
    },
    {
      name: 'Tellus Ultricies Cursus',
      description: 'Nascetur ridiculus mus.'
    }
  ])

  api.store.addMetadata('myList', [
    {
      name: 'Vulputate Magna',
      description: 'Cras justo odio.'
    }
  ])

  api.store.addMetadata('myOtherValue', 'Value')

  api.store.addMetadata('overrideValue', 'Value 1')
  api.store.addMetadata('overrideValue', 'Value 2')

  const query = `{
    metadata {
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
  expect(data.metadata.myValue.test).toEqual('Test Value')
  expect(data.metadata.myValue.image.src).toEqual('/assets/static/350x250.5c1e01e.test.png')
  expect(data.metadata.myValue.file.src).toEqual('/assets/files/dummy.test.pdf')
  expect(data.metadata.myValue.object.list).toHaveLength(3)
  expect(data.metadata.myValue.object.value).toEqual(1000)
  expect(data.metadata.myOtherValue).toEqual('Value')
  expect(data.metadata.overrideValue).toEqual('Value 2')
  expect(data.metadata.myList).toHaveLength(3)
  expect(data.metadata.myList[0]).toMatchObject({
    name: 'Etiam Nibh',
    description: 'Sociis natoque penatibus.'
  })
  expect(data.metadata.myList[1]).toMatchObject({
    name: 'Tellus Ultricies Cursus',
    description: 'Nascetur ridiculus mus.'
  })
  expect(data.metadata.myList[2]).toMatchObject({
    name: 'Vulputate Magna',
    description: 'Cras justo odio.'
  })
})

function createSchemaAndExecute (query) {
  return app.schema.buildSchema().runQuery(query)
}
