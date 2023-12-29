import {atom, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {createInstances, GetAction, Interaction, KlassInstance, PayloadItem} from "@interaqt/shared";
import {PORT} from "../../config.js";
import PlugIcon from './icons/Plug'
import OutBoxIcon from './icons/OutBox'
import DataIcon from './icons/Data'
import DatabaseIcon from "./icons/Plug.js";
import InteractionAPIPanel from "./InteractionAPIPanel.js";
import {SlideOvers} from "./utils/SlideOvers.js";
import {renderAttributives} from "./common.js";
import {MapData} from "@interaqt/storage";



function renderInteraction(interaction: KlassInstance<typeof Interaction, false>, onInteractionClick: (i: KlassInstance<typeof Interaction, false>) => any, createElement: InjectHandles['createElement']) {
    return (
        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
            <div class="min-w-0 flex-auto">
                <div class="flex items-center gap-x-3">
                    <h2 class="flex min-w-0 text-2xl font-semibold leading-6 text-white">
                        <a href="#" class="flex gap-x-2">
                            <span class="truncate">{interaction.name}</span>
                        </a>
                        <span class="ml-16 cursor-pointer flex text-xl" >
                            <button onClick={() => onInteractionClick(interaction)} type="button" class="rounded bg-white/10 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-white/20">Mock</button>

                        </span>
                    </h2>
                </div>

                <div class="flex items-center gap-x-3 mt-4">
                    <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                        <a href="#" class="flex gap-x-2">
                            <DataIcon />
                            <span class="truncate">Payload Items</span>
                        </a>
                    </h2>
                </div>

                <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="py-2 align-middle sm:px-6 lg:px-8">
                        <div class="-mx-4 mt-4 ring-1 ring-gray-800 sm:mx-0 sm:rounded-lg">
                            <table class="min-w-full divide-y divide-gray-700">
                                <thead class="">
                                <tr class="divide-x divide-gray-800">
                                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">Payload Name</th>
                                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">Attributive</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Type</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Multiple</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Is Reference</th>
                                </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-800">
                                {interaction.payload?.items.map((payload: KlassInstance<typeof PayloadItem, false>) => (
                                    <tr class="divide-x divide-gray-800">
                                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">
                                            <div>
                                                {payload.name}
                                            </div>
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            <div>{renderAttributives(payload.attributives)}</div>
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            <div>{payload.base.name}</div>
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            {payload.isCollection ? 'true' : ''}
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            {payload.isRef ? 'true' : ''}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-x-3 mt-4 ">
                    <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                        <a href="#" class="flex gap-x-2">
                            <PlugIcon/>
                            <span class="truncate">API Information</span>
                        </a>
                    </h2>
                </div>

                <div class="mt-4 ring-1 ring-gray-800 sm:rounded-lg">
                    <table class="min-w-full divide-y divide-gray-700">
                        <tbody class="divide-y divide-gray-800">
                        <tr class="divide-x divide-gray-800">
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">Endpoint</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                <a class="" >
                                    http://[host]:{PORT}/interaction
                                </a>
                            </td>
                        </tr>
                        <tr class="divide-x divide-gray-800">
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">method</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                <a class="">
                                    POST
                                </a>
                            </td>
                        </tr>
                        <tr class="divide-x divide-gray-800">
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">Body</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
<pre>
{`{
    interaction : "${interaction.name}",
    payload: {${interaction.payload?.items.map(
    (item) => `
        ${item.name}: ${item.isCollection? '[': ''}${item.isRef? '{id:1}' : '{}'}${item.isCollection? ']': ''},  // ${item.isRef ? `${item.base.name} record` : `new ${item.base.name} data`}`
).join('')}
    }
}`}
</pre>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </li>
    )
}


function renderGetInteraction(interaction: KlassInstance<typeof Interaction, false>, onInteractionClick: (interaction: KlassInstance<typeof Interaction, false>) => any, createElement: InjectHandles['createElement']) {
    return (
        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
            <div class="min-w-0 flex-auto">
                <div class="flex items-center gap-x-3">
                    <h2 class="min-w-0 text-2xl font-semibold leading-6 text-white">
                        <a href="#" class="flex gap-x-2">
                            <span >{interaction.name}</span>
                            <OutBoxIcon />
                        </a>
                        <span class="ml-16 cursor-pointer" onClick={() => onInteractionClick(interaction)}>
                            <DatabaseIcon />
                        </span>
                    </h2>
                </div>


                <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="py-2 align-middle sm:px-6 lg:px-8">
                        <div class="-mx-4 mt-4 ring-1 ring-gray-800 sm:mx-0 inline-block">
                            <table class=" divide-y divide-gray-700">
                                <tbody class="divide-y divide-gray-800">
                                    <tr class="divide-x divide-gray-800">
                                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">
                                            Data Type
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            {interaction.data!._type}
                                        </td>
                                    </tr>
                                    <tr class="divide-x divide-gray-800">
                                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">
                                            Data Attribute
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            {renderAttributives(interaction.dataAttributives)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-x-3 mt-4 ">
                    <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                        <a href="#" class="flex gap-x-2">
                            <PlugIcon/>
                            <span class="truncate">API Information</span>
                        </a>
                    </h2>
                </div>

                <div class="mt-4 ring-1 ring-gray-800 sm:rounded-lg">
                    <table class="min-w-full divide-y divide-gray-700">
                        <tbody class="divide-y divide-gray-800">
                        <tr class="divide-x divide-gray-800">
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">Endpoint</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                <a class="" >
                                    http://[host]:{PORT}/interaction
                                </a>
                            </td>
                        </tr>
                        <tr class="divide-x divide-gray-800">
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">method</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                <a class="">
                                    POST
                                </a>
                            </td>
                        </tr>
                        <tr class="divide-x divide-gray-800">
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">Body</td>
                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
<pre>
{`{
    interaction : "${interaction.name}",
    query: {
        // orderBy: ['id', 'desc'],  // order by sortable attribute
        limit: 10,
        offset: 20
    }
}`}
</pre>
                            </td>
                        </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </li>
    )
}


/* @jsx createElement */
export function InteractionPage(props: Props, { createElement }: InjectHandles) {

    const instancesByName = atom<{Interaction: KlassInstance<typeof Interaction, false>[]}>({Interaction: []})
    const panelVisible = atom<boolean>(false)
    const panelTitle = atom('')
    const selectedInteraction = atom<KlassInstance<typeof Interaction, false>|null>(null)

    const dbMap = atom<MapData|null>(null)


    ;(async function() {
        const {dataStr, map} = await post('/api/getSystemInfo', [])
        const allInstances = [...createInstances(JSON.parse(dataStr)).values()]

        const dataByName = allInstances.reduce<{[k:string]: any}>((result, instance) => {
            return {
                ...result,
                [instance._type]: [...result[instance._type] || [], instance]
            }
        }, {})

        dbMap(map)
        instancesByName(dataByName)
    })()

    const onInteractionClick=(interaction: KlassInstance<typeof Interaction, false>) => {
        selectedInteraction(interaction)
        panelTitle(`${interaction.name} api`)
        panelVisible(true)
    }


    return (
        <main class="lg">

            <SlideOvers visible={panelVisible} title={panelTitle}>
                {() => panelVisible() ? <InteractionAPIPanel interaction={selectedInteraction} map={dbMap} /> : null}
            </SlideOvers>

            <header class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <h1 class="text-base text-2xl font-semibold leading-8 text-white">Interactions</h1>
            </header>

            <ul role="list" class="divide-y divide-white/5 space-y-16">
                {() => {
                    return instancesByName().Interaction?.map((interaction: KlassInstance<typeof Interaction, false>) => interaction.action.name === GetAction.name ? renderGetInteraction(interaction, onInteractionClick, createElement): renderInteraction(interaction, onInteractionClick, createElement))
                }}
            </ul>
        </main>
    )
}