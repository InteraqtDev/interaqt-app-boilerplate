import {atom, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {createInstances, Entity, Property, KlassInstance} from "@interaqt/shared";

/* @jsx createElement */
export function EntityPage(props: Props, { createElement }: InjectHandles) {

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
                <h1 class="text-base font-semibold leading-7 text-white">Entity & Relation</h1>
            </header>

            <ul role="list" class="divide-y divide-white/5">
                {() => {
                    return instancesByName().Entity?.map((entity: KlassInstance<typeof Entity, false>) => (
                        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div class="min-w-0 flex-auto">
                                <div class="flex items-center gap-x-3">
                                    <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                                        <a href="#" class="flex gap-x-2">
                                            <span class="truncate">{entity.name}</span>
                                        </a>
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
                                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Collection</th>
                                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Computed Type</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody class="divide-y divide-gray-800">
                                                    { entity.properties?.map((property: KlassInstance<typeof Property, false>) => (
                                                        <tr class="divide-x divide-gray-800">
                                                            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">{property.name}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{property.type}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{property.collection}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{property.computedData?._type}</td>
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

                {() => {
                    return instancesByName().Relation?.map((entity: KlassInstance<typeof Entity, false>) => (
                        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div class="min-w-0 flex-auto">
                                <div class="flex items-center gap-x-3">
                                    <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                                        <a href="#" class="flex gap-x-2">
                                            <span class="truncate">{entity.name}</span>
                                        </a>
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
                                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Collection</th>
                                                        <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Computed Type</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody class="divide-y divide-gray-800">
                                                    { entity.properties?.map((property: KlassInstance<typeof Property, false>) => (
                                                        <tr class="divide-x divide-gray-800">
                                                            <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">{property.name}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{property.type}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{property.collection}</td>
                                                            <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">{property.computedData?._type}</td>
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