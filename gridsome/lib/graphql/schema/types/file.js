const fs = require('fs');
const path = require('path');
const { GraphQLString, GraphQLObjectType, GraphQLBoolean } = require('../../graphql')

exports.GraphQLFile = new GraphQLObjectType({
    name: 'File',
    fields: () => ({
        path: { type: GraphQLString },
        accessible: { type: GraphQLBoolean },
        type: { type: GraphQLString }
    }),
});

exports.isFile = value => {
    if (!(typeof value === 'string' || value instanceof String)) {
        return false;
    }

    if(path.basename(value) === value) {
        return false;
    }    

    return true;
}

exports.fileType = {
    type: exports.GraphQLFile,
    args: {},
    resolve: (fields, {}, context, { fieldName }) => ({
        path: fields[fieldName],
        accessible: fs.existsSync(fields[fieldName]),
        type: path.extname(fields[fieldName]),
    })
}