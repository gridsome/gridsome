const Airtable = require('airtable');

module.exports = function (api, options) {
    const base = new Airtable({apiKey: options.apiKey}).base(options.base);
    const table = options.table
    const typeName = table.replace(/ /g, '');
    const route = typeName.toLowerCase();

    api.loadSource(async store => {
        const contentType = store.addContentType({
            typeName: typeName,
            // TODO: Gives me "duplicate route" error
            route: `/${route}/:slug`
        });

        await base(table).select().eachPage((records, fetchNextPage) => {
            records.forEach((record) => {
                const item = record._rawJson;
                contentType.addNode({
                    id: item.id,
                    fields: item.fields
                });
            });
            fetchNextPage();
        });
    });
};
