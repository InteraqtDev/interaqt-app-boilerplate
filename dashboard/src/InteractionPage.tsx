import {atom, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {createInstances, Entity, KlassInstance, Interaction, Property, PayloadItem} from "@interaqt/shared";
import {PORT} from "../../config.js";
import  PlugIcon from './icons/Plug'
import  DataIcon from './icons/Data'

/* @jsx createElement */
export function InteractionPage(props: Props, { createElement }: InjectHandles) {

    const instancesByName = atom({})

    ;(async function() {
        const {dataStr} = await post('/data/getSystemInfo', [])
        const allInstances = [...createInstances(JSON.parse(dataStr)).values()]

        const dataByName = allInstances.reduce<{[k:string]: any}>((result, instance) => {
            return {
                ...result,
                [instance._type]: [...result[instance._type] || [], instance]
            }
        }, {})

        console.log(dataByName)

        instancesByName(dataByName)
    })()


    return (
        <main class="lg">
            <header class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <h1 class="text-base text-2xl font-semibold leading-8 text-white">Interactions</h1>
            </header>

            <ul role="list" class="divide-y divide-white/5 space-y-16">
                {() => {
                    return instancesByName().Interaction?.map((interaction: KlassInstance<typeof Interaction, false>) => (
                        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div class="min-w-0 flex-auto">
                                <div class="flex items-center gap-x-3">
                                    <h2 class="min-w-0 text-2xl font-semibold leading-6 text-white">
                                        <a href="#" class="flex gap-x-2">
                                            <span class="truncate">{interaction.name}</span>
                                        </a>
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
                                                    http://[host]:{PORT}/api
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
    interaction : ${interaction.name},
    payload: {${interaction.payload?.items.map(
    (item) => `
        ${item.name}: ${item.isCollection? '[': ''}${item.isRef? '{id:1}' : '{}'}${item.isCollection? ']': ''}  // ${item.isRef ? `${item.base.name} record` : `new ${item.base.name} data`}`
).join(',')}
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
                    ))
                }}


            </ul>
        </main>
    )
}