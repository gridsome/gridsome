const fs = require('fs');
const path = require('path');

const { GraphQLJSON } = require('../../graphql')
const { SUPPORTED_IMAGE_TYPES } = require('../../../utils/constants');

exports.isImage = value => {
    const extName = path.extname(value);

    if (!(typeof value === 'string' || value instanceof String)) {
        return false;
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(extName)) {
        return false;
    }

    if(path.basename(value) === value) {
        return false;
    }    

    return true;
}

exports.imageType = {
    type: GraphQLJSON,
    args: {},
    resolve: async (fields, {}, context, { fieldName }) => {
        if (!fs.existsSync(fields[fieldName])) {
            return fields[fieldName];
        }

        const result = await process.GRIDSOME.queue.add(fields[fieldName]);
        
        return result;
    }
}