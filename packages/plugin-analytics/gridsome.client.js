import VueAnalytics from 'vue-analytics';
/**
 * @param Vue                 Vue instance
 * @param options             Plugin options
 * @param context.appOptions  Options for the Vue instance
 * @param context.router      The router instance
 * @param context.head        VueMeta info objet
 * @param context.isClient
 * @param context.isServer
 */
export default function (Vue, options, { isServer, router }) {

    const baseOptions = {
        disabled: isServer,
        debug: {
            sendHitTask: process.env.NODE_ENV === 'production'
        },
        router
    };

    Vue.use(VueAnalytics, { ...baseOptions, ...options });
}