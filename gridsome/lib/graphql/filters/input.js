const { hasNodeReference } = require('../utils')

const {
  EnumTypeComposer,
  ObjectTypeComposer
} = require('graphql-compose')

const {
  listOperators,
  scalarOperators,
  defaultOperators,
  toOperatorConfig
} = require('./operators')

function createFilterInput (schemaComposer, typeComposer) {
  const inputTypeName = `${typeComposer.getTypeName()}FilterInput`
  const inputTypeComposer = schemaComposer.getOrCreateITC(inputTypeName)

  typeComposer.getFieldNames().forEach(fieldName => {
    const fieldTypeComposer = typeComposer.getFieldTC(fieldName)

    if (fieldTypeComposer instanceof ObjectTypeComposer) {
      inputTypeComposer.setField(fieldName, {
        type: fieldTypeComposer.hasInterface('Node')
          ? createInputTypeComposer(schemaComposer, typeComposer, fieldName)
          : createFilterInput(schemaComposer, fieldTypeComposer)
      })
    } else {
      inputTypeComposer.setField(fieldName, {
        type: createInputTypeComposer(
          schemaComposer,
          typeComposer,
          fieldName
        )
      })
    }

    const extensions = typeComposer.getFieldExtensions(fieldName)
    inputTypeComposer.setFieldExtensions(fieldName, extensions)
  })

  typeComposer.setInputTypeComposer(inputTypeComposer)

  return inputTypeComposer
}

function createInputTypeComposer (schemaComposer, typeComposer, fieldName) {
  const inputTypeName = createInputTypeName(typeComposer, fieldName)

  if (schemaComposer.has(inputTypeName)) {
    return schemaComposer.get(inputTypeName)
  }

  const operatorTypeComposer = schemaComposer.createInputTC(inputTypeName)
  const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
  const typeName = fieldTypeComposer.getTypeName()

  let fieldType = typeName
  let operators = defaultOperators

  if (scalarOperators[typeName]) {
    operators = scalarOperators[typeName]
  } else if (hasNodeReference(fieldTypeComposer)) {
    fieldType = 'ID'
  } else if (fieldTypeComposer instanceof EnumTypeComposer) {
    operators = scalarOperators.Enum
  }

  if (typeComposer.isFieldPlural(fieldName)) {
    operators = listOperators
  }

  operatorTypeComposer.addFields(
    createInputFields(
      typeComposer,
      fieldName,
      fieldType,
      operators
    )
  )

  return operatorTypeComposer
}

function createInputTypeName (typeComposer, fieldName) {
  const { isInferred = false } = typeComposer.getFieldExtensions(fieldName)
  const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
  const isList = typeComposer.isFieldPlural(fieldName)

  let typeName = fieldTypeComposer.getTypeName()

  if (hasNodeReference(fieldTypeComposer)) {
    typeName += isInferred ? 'Inferred' : ''
  }

  return `${typeName}${isList ? 'List' : ''}QueryOperatorInput`
}

function createInputFields (typeComposer, fieldName, typeName, operators) {
  const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
  const extensions = {}

  if (hasNodeReference(fieldTypeComposer)) {
    extensions.isNodeReference = true
  }

  return toOperatorConfig(operators, typeName, extensions)
}

module.exports = {
  createFilterInput
}
