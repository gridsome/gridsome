const { hasNodeReference } = require('../utils')
const { without } = require('lodash')

const {
  EnumTypeComposer,
  ObjectTypeComposer,
  InputTypeComposer
} = require('graphql-compose')

const {
  listOperators,
  scalarOperators,
  defaultOperators,
  toOperatorConfig
} = require('./operators')

function createFilterInput (schemaComposer, typeComposer) {
  const inputTypeName = `${typeComposer.getTypeName()}FilterInput`
  const inputTypeComposer = typeComposer.getInputTypeComposer()
  const filterTypeComposer = schemaComposer.getOrCreateITC(inputTypeName)

  typeComposer.setInputTypeComposer(filterTypeComposer)

  if (
    typeComposer.hasInterface('Node') &&
    inputTypeComposer.hasField('id')
  ) {
    filterTypeComposer.setField('id', inputTypeComposer.getField('id'))
  }

  inputTypeComposer.getFieldNames().forEach(fieldName => {
    const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
    const extensions = typeComposer.getFieldExtensions(fieldName)

    let type

    if (fieldTypeComposer instanceof ObjectTypeComposer) {
      type = fieldTypeComposer.hasInterface('Node')
        ? createReferenceInputTypeComposer({
          inputTypeComposer,
          fieldTypeComposer,
          schemaComposer,
          typeComposer,
          fieldName
        })
        : createFilterInput(schemaComposer, fieldTypeComposer)
    } else {
      type = createInputTypeComposer({
        inputTypeComposer,
        schemaComposer,
        typeComposer,
        fieldName
      })
    }

    if (type) {
      filterTypeComposer.setField(fieldName, { type })
      filterTypeComposer.setFieldExtensions(fieldName, extensions)
    }
  })

  return removeEmptyTypes(filterTypeComposer)
}

function removeEmptyTypes (typeComposer, done = new Set()) {
  if (done.has(typeComposer)) return typeComposer

  done.add(typeComposer)

  typeComposer.getFieldNames().forEach(fieldName => {
    const fieldTypeComposer = typeComposer.getFieldTC(fieldName)

    if (fieldTypeComposer instanceof InputTypeComposer) {
      if (fieldTypeComposer.getFieldNames().length > 0) {
        removeEmptyTypes(fieldTypeComposer, done)
      } else {
        typeComposer.removeField(fieldName)
      }
    }
  })

  return typeComposer
}

function createReferenceInputTypeComposer({
  schemaComposer,
  fieldTypeComposer,
  typeComposer,
  fieldName
}) {
  const inputTypeName = createInputTypeName(typeComposer, fieldName)

  if (schemaComposer.has(inputTypeName)) {
    return schemaComposer.get(inputTypeName)
  }

  const operatorTypeComposer = schemaComposer.createInputTC(inputTypeName)
  const fieldExtensions = typeComposer.getFieldExtensions(fieldName)
  const isPlural = typeComposer.isFieldPlural(fieldName)

  // TODO: filter by all fields on referenced type
  operatorTypeComposer.setField('id', createInputTypeComposer({
    inputTypeComposer: fieldTypeComposer.getInputTypeComposer(),
    typeComposer: fieldTypeComposer,
    schemaComposer,
    fieldName: 'id'
  }))

  operatorTypeComposer.setFieldExtension('id', 'isReference', true)
  operatorTypeComposer.setFieldExtension('id', 'isPlural', isPlural)

  // TODO: remove these before 1.0
  // Mark field as deprecated if not created by `store.addReference()`.
  const extensions = {
    isInferredReference: !fieldExtensions.isDefinedReference
  }
  const deprecationReason = 'Use the id field instead.'
  if (isPlural) {
    operatorTypeComposer.addFields(
      toOperatorConfig(listOperators, 'ID', extensions, deprecationReason)
    )
  } else {
    operatorTypeComposer.addFields(
      toOperatorConfig(
        without(scalarOperators.ID, 'exists'),
        'ID',
        extensions,
        deprecationReason
      )
    )
  }

  return operatorTypeComposer
}

function createInputTypeComposer({
  inputTypeComposer,
  schemaComposer,
  typeComposer,
  fieldName
}) {
  const inputTypeName = createInputTypeName(typeComposer, fieldName)

  if (schemaComposer.has(inputTypeName)) {
    return schemaComposer.get(inputTypeName)
  }

  const fieldTypeComposer = typeComposer.getFieldTC(fieldName)
  const operatorTypeComposer = schemaComposer.createInputTC(inputTypeName)
  const fieldInputTypeComposer = inputTypeComposer.getFieldTC(fieldName)
  const fieldConfig = typeComposer.getFieldConfig(fieldName)
  const extensions = typeComposer.getFieldExtensions(fieldName)
  const typeName = fieldInputTypeComposer.getTypeName()

  // TODO: create input types for fields with custom resolver
  if (fieldConfig.resolve && !extensions.isInferred) {
    return
  }

  let fieldType = typeName
  let operators = defaultOperators

  if (scalarOperators[typeName]) {
    operators = scalarOperators[typeName]
  } else if (hasNodeReference(fieldTypeComposer)) {
    fieldType = 'ID'
  } else if (fieldInputTypeComposer instanceof EnumTypeComposer) {
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
  const fieldExtensions = typeComposer.getFieldExtensions(fieldName)
  const extensions = {}

  if (hasNodeReference(fieldTypeComposer)) {
    extensions.isNodeReference = true
  }

  return toOperatorConfig(operators, typeName, { ...fieldExtensions, ...extensions })
}

module.exports = {
  createFilterInput
}
