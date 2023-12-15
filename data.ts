import {Controller, createDataAPI, BoolExp, DataAPIContext, stringifyAllInstances, DataAPI} from "@interaqt/runtime";

export async function createInitialData(controller: Controller) {
    const system = controller.system
    const userARef = await system.storage.create('User', {name: 'A'})
    const userBRef = await system.storage.create('User', {name: 'B', supervisor: userARef})
    const userCRef = await system.storage.create('User', {name: 'C', supervisor: userBRef})
}



export const apis: {[k:string]: DataAPI } = {
    getUsers: createDataAPI(function getUsers(this: Controller) {
        return this.system.storage.find('User', undefined, undefined, ['*'])
    }, { allowAnonymous: true }),
    getSystemInfo: createDataAPI(function getUsers(this: Controller) {
        return {
            dataStr: stringifyAllInstances(),
            map: this.system.storage.map,
            apis: Object.fromEntries(Object.entries(apis as {[k:string]: DataAPI }).map(([name, api]) => {
                return [name, {
                    params: api.params?.map(param => typeof param === 'string' ? param : param.toString()) ,
                    allowAnonymous: api.allowAnonymous
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
