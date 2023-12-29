import {atom, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {createInstances, Entity, Interaction, KlassInstance, Property} from "@interaqt/shared";


type TableContent = {
    records: string[],
    fields: {
        attribute: string,
        field: string,
        record: string,
        type: string
    }[]
}

type Tables = {[k:string]: TableContent}

/* @jsx createElement */
export function DatabasePage(props: Props, { createElement }: InjectHandles) {

    const tables = atom({} as Tables)

    ;(async function() {
        const { map } = await post('/api/getSystemInfo', [])
        console.log(map.records)

        const dataByTable: Tables = {}

        Object.entries(map.records).forEach(([recordName, record] : [string, any]) => {
            if (!dataByTable[record.table]) {
                dataByTable[record.table] = {
                    records: [],
                    fields: []
                }
            }
            dataByTable[record.table].records.push(recordName)

        })

        // 分成两次来处理，因为 attribute 的 field 可能不在自己 table 上。
        Object.entries(map.records).forEach(([recordName, record] : [string, any]) => {
            Object.entries(record.attributes).forEach(([attributeName, attribute]: [string, any]) => {
                if (!attribute.isRecord) {
                    const attributeTable = attribute.table || record.table
                    dataByTable[attributeTable].fields.push({attribute: attributeName, field: attribute.field, record: recordName, type: attribute.type})
                }
            })
        })

        tables(dataByTable)

    })()

    // TODO 错了，应该是从 table 的角度组织数据，而不是从 entity 的角度组织数据

    return (
        <main class="lg">
            <header class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <h1 class="text-base font-semibold leading-7 text-white">Database Tables</h1>
            </header>

            <ul role="list" class="divide-y divide-white/5 space-y-16">
                {() => {
                    return Object.entries(tables() as Tables).map(([name, tableContent]) => (
                        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div class="min-w-0 flex-auto">
                                <div class="flex items-center gap-x-3">
                                    <h2 class="min-w-0 text-xl font-semibold leading-6 text-white">
                                        <a href="#" class="flex gap-x-2">
                                            {name}
                                        </a>
                                        <div class="min-w-0 text-sm">
                                            [{tableContent.records.join(' | ')}]
                                        </div>
                                    </h2>
                                </div>

                                <div class=" flow-root">
                                    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                        <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                            <div class="-mx-4 mt-4 ring-1 ring-gray-800 sm:mx-0 sm:rounded-lg">
                                                <table class="min-w-full divide-y divide-gray-700">
                                                    <thead class="">
                                                    <tr class="divide-x divide-gray-800">
                                                        <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">Name</th>
                                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Type</th>
                                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Entity Property</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody class="divide-y divide-gray-800">
                                                    { tableContent.fields.map(({field, record, attribute, type}) => (
                                                        <tr class="divide-x divide-gray-800">
                                                            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">{field}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{type}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{record}.{attribute}</td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </li>
                    ))
                }}

            </ul>
        </main>
    )
}