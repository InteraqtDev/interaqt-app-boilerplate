import {atom, computed, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {createInstances, Entity, Property, Relation, KlassInstance, ComputedData} from "@interaqt/shared";
import EntityIcon from "./icons/Entity";
import LinkIcon from "./icons/Link";
import LockIcon from "./icons/Lock";
import DatabaseIcon from "./icons/Database";
import {MapData, RecordAttribute} from "@interaqt/storage";
import 'animate.css'
import {SlideOvers} from "./utils/SlideOvers.js";
import RecordDataPanel from "./RecordDataPanel.js";

type NameToEntity = {
    [k:string] : KlassInstance<typeof Entity, false>
}

/* @jsx createElement */
export function EntityPage(props: Props, { createElement }: InjectHandles) {

    const instancesByName = atom({} as NameToEntity)
    const dbMap = atom({} as MapData)
    const hash = atom('')

    ;(async function() {
        const {dataStr, map} = await post('/api/getSystemInfo', [])
        const allInstances = [...createInstances(JSON.parse(dataStr)).values()]

        const dataByName = allInstances.reduce<{[k:string]: any}>((result, instance) => {
            if (instance._type !== 'Entity') return result

            return {
                ...result,
                [(instance as KlassInstance<typeof Entity, false>).name]: instance
            }
        }, {})

        instancesByName(dataByName)
        dbMap(map)

        window.addEventListener('hashchange', () => {
            hash(location.hash.slice(1, Infinity))
        });
    })()

    const panelVisible = atom(false)
    const panelTitle = atom('')
    const selectedRecord = atom('')


    const onRecordDataClick = (recordName: string) => {
        selectedRecord(recordName)
        panelTitle(`${recordName} data`)
        panelVisible(true)
    }

    return (
        <main class="lg">
            <header class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <h1 class="text-base text-lg font-semibold leading-7 text-white flex content-center ">
                    <EntityIcon />
                    <span class="ml-1">Entity</span>
                    <span class="ml-6"> </span>
                    <LinkIcon />
                    <span class="ml-1">Relation</span>
                </h1>
            </header>

            <SlideOvers visible={panelVisible} title={panelTitle}>
                {() => panelVisible() ? <RecordDataPanel record={selectedRecord} map={dbMap} /> : null}
            </SlideOvers>

            <ul role="list" class="divide-y divide-white/5 space-y-16">
                {() => {
                    const EntityByName = instancesByName() as NameToEntity
                    const map = (dbMap()  || {}) as MapData
                    return Object.entries(map.records||{}).map(([recordName, record]) => {
                        const Entity = EntityByName[recordName]!
                        const titleClassName = () => hash() === recordName ? 'min-w-0 text-lg flex font-semibold leading-6 text-white animate__animated animate__flash' : 'min-w-0 text-lg flex  font-semibold leading-6 text-white'
                        return (
                            <li id={recordName} class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                                <div class="min-w-0 flex-auto">
                                    <div class="flex items-center gap-x-3">
                                        <h2 class={titleClassName} >
                                            <a class="flex gap-x-2 cursor-pointer" title={record.isRelation ? 'relation' : /^_/.test(recordName) ? 'system record' : 'entity'}>
                                                    {record.isRelation ? <LinkIcon /> : <EntityIcon />}
                                                    {/^_/.test(recordName) ? <LockIcon /> : null}
                                                    {recordName}
                                                    {/^_/.test(recordName) ? ' [system record]' : ''}
                                            </a>
                                            <span class="ml-16 cursor-pointer flex  gap-x-2">
                                                <button  onClick={() => onRecordDataClick(recordName)} type="button" class="rounded bg-white/10 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-white/20">View data</button>
                                            </span>
                                        </h2>
                                    </div>


                                    {Entity?.computedData?._type ? (
                                        <div class="min-w-0 text-sm font-semibold leading-6 text-white">
                                            Computed Type:  {Entity?.computedData?._type}
                                        </div>
                                    ) : null}


                                    {() => {
                                        if (record.isRelation) {
                                            const link = map.links[recordName]
                                            return (
                                                <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                                    <div class="inline-block py-2 align-middle sm:px-6 lg:px-8">
                                                        <div class="-mx-4 mt-4 ring-1 ring-gray-800 sm:mx-0 sm:rounded-lg">
                                                            <table class="min-w-full divide-y divide-gray-700">
                                                                <tbody class="divide-y divide-gray-800">
                                                                    <tr class="divide-x divide-gray-800">
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">source record</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                                            <a class="cursor-pointer underline" href={`#${link.sourceRecord}`}>
                                                                                {link.sourceRecord}
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                    <tr class="divide-x divide-gray-800">
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">source property</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                                            <a class="cursor-pointer underline" href={`#${link.sourceRecord}.${link.sourceProperty}`}>
                                                                                {link.sourceProperty}
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                    <tr class="divide-x divide-gray-800">
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">relation type</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{link.relType.join(':')}</td>
                                                                    </tr>
                                                                    <tr class="divide-x divide-gray-800">
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">target record</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                                            <a class="cursor-pointer underline" href={`#${link.targetRecord}`}>
                                                                                {link.targetRecord}
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                    <tr class="divide-x divide-gray-800">
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">target property</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                                            <a class="cursor-pointer underline" href={`#${link.targetRecord}.${link.targetProperty}`}>
                                                                                {link.targetProperty}
                                                                            </a>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        } else {
                                            return null
                                        }

                                    }}

                                    <div class="flow-root">
                                        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                                <div class="-mx-4 mt-4 ring-1 ring-gray-800 sm:mx-0 sm:rounded-lg">
                                                    <table class="min-w-full divide-y divide-gray-700">
                                                        <thead class="">
                                                        <tr class="divide-x divide-gray-800">
                                                            <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">Name</th>
                                                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Type</th>
                                                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Collection</th>
                                                            <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Computed Type</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody class="divide-y divide-gray-800">
                                                        { Object.entries(record.attributes).map(([name, attribute]) => {

                                                            if ((attribute as RecordAttribute).isRecord) {
                                                                const recordAttribute = attribute as RecordAttribute
                                                                const link = map.links[recordAttribute.linkName]
                                                                const target = recordAttribute.isSource ? link.targetRecord : link.sourceRecord
                                                                const targetProp = recordAttribute.isSource ? link.targetProperty : link.sourceProperty

                                                                const trClass = () => computed(() => hash() === `${recordName}.${name}` ? 'divide-x divide-gray-800 animate__animated animate__flash' : 'divide-x divide-gray-800')

                                                                return (
                                                                    <tr class={trClass} id={`${recordName}.${name}`}>
                                                                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">
                                                                            <div>
                                                                                {name}
                                                                            </div>
                                                                            <div>[{recordAttribute.relType.join(":")}]</div>
                                                                            <a class="cursor-pointer underline" href={`#${target}.${targetProp}`}>{target}.{targetProp}</a>
                                                                        </td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                                            <div>relation{recordAttribute.isReliance ? '[reliance]' : ''}</div>
                                                                            <a class="cursor-pointer underline" href={`#${link.recordName}`}>{link.recordName}</a>
                                                                        </td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300"></td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300"></td>
                                                                    </tr>
                                                                )

                                                            } else {

                                                                const Property = EntityByName[recordName]?.properties.find(p => p.name === name)
                                                                return (
                                                                    <tr class="divide-x divide-gray-800">
                                                                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">{name}</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{attribute.type}</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{Property?.collection ? 'true' : ''}</td>
                                                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{Property?.computedData?._type}</td>
                                                                    </tr>
                                                                )
                                                            }
                                                        })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )
                    })
                }}
            </ul>
        </main>
    )
}