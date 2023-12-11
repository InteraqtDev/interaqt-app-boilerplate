import {Controller, createDataAPI, BoolExp, DataAPIContext, stringifyAllInstances} from "@interaqt/runtime";

export async function createInitialData(controller: Controller) {
    const system = controller.system
    const userARef = await system.storage.create('User', {name: 'A'})
    const userBRef = await system.storage.create('User', {name: 'B', supervisor: userARef})
    const userCRef = await system.storage.create('User', {name: 'C', supervisor: userBRef})
}



export const apis = {
    getUsers: createDataAPI(function getUsers(this: Controller) {
        return this.system.storage.find('User', undefined, undefined, ['*'])
    }, { allowAnonymous: true }),
    getRequestById: createDataAPI(function getRequestById(this: Controller, context: DataAPIContext, id: string) {
        const match = BoolExp.atom({
            key: 'id',
            value: ['=', id]
        })
        return this.system.storage.findOne('Request', match, undefined, ['*'])
    }, { params: ['string']}),
    getSystemInfo: createDataAPI(function getUsers(this: Controller) {
        return {
            dataStr: stringifyAllInstances(),
            map: this.system.storage.map,
        }
    }, { allowAnonymous: true }),

}
