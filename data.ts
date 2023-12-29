import {Controller, createDataAPI, BoolExp, DataAPIContext, stringifyAllInstances, DataAPI} from "@interaqt/runtime";




export const apis: {[k:string]: DataAPI } = {
    getUsers: createDataAPI(function getUsers(this: Controller) {
        return this.system.storage.find('User', undefined, undefined, ['*'])
    }, { allowAnonymous: true }),
    getSystemInfo: createDataAPI(function getUsers(this: Controller) {
        return {
            dataStr: stringifyAllInstances(),
            map: this.system.storage.map,
            apis: Object.fromEntries(Object.entries(apis as {[k:string]: DataAPI }).map(([name, api]) => {

                const parseParam = (param: string) => typeof param === 'string' ? param : (param as any)?.toString()

                const paramsStr = api.params ?
                    (api.useNamedParams ?
                            Object.fromEntries(Object.entries(api.params).map(([key, param]) => [key, parseParam(param)])):
                            (api.params as any[]).map(param => typeof param === 'string' ? param : param.toString())
                    ) :
                    api.params

                return [name, {
                    params: paramsStr,
                    allowAnonymous: api.allowAnonymous,
                    useNamedParams: api.useNamedParams
                }]
            }))
        }
    }, { allowAnonymous: true }),
    getRecords: createDataAPI(function getRecords(this: Controller, context: DataAPIContext, recordName:string, match: BoolExp<any>, attributes = ['*']) {
        return this.system.storage.find(recordName, match, undefined, attributes)
    }, { allowAnonymous: true, params: ['string', BoolExp, 'object'] }),
    createRecord: createDataAPI(function createRecord(this: Controller, context: DataAPIContext, recordName:string, newData: any) {
        return this.system.storage.create(recordName, newData)
    }, { allowAnonymous: true, params: ['string', 'object'] }),

}
