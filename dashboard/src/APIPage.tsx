import {atom, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {PORT} from "../../config.js";
import {EventPayload, EventQuery} from "../../../interaqt/packages/runtime/types/interaction.js";
import LinkIcon from "./icons/Link.js";
import EntityIcon from "./icons/Entity.js";
import LockIcon from "./icons/Lock.js";
import {createInstances, KlassInstance, PayloadItem} from "@interaqt/shared";

type DataAPIs = {
    [k:string]: {
        params: string[],
        allowAnonymous: boolean
    }
}

/* @jsx createElement */
export function APIPage(props: Props, { createElement }: InjectHandles) {
    const dataAPIS = atom({} as DataAPIs)
    ;(async function() {
        const {apis} = await post('/api/getSystemInfo', [])
        dataAPIS(apis)
    })()
    return (
        <main class="lg">
            <header class="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <h1 class="text-base font-semibold leading-7 text-white">API</h1>
            </header>

            <div class="divide-y space-y-16 divide-gray-800">

                <div>
                    <div class="flex items-center gap-x-3 px-6 py-4">
                        <h2 class="min-w-0 text-lg font-semibold leading-6 text-white ">
                            <a class="flex gap-x-2 cursor-pointer">
                                Interaction API
                            </a>
                        </h2>
                        <a href="/interaction" class="text-white underline cursor-pointer">
                            See all interaction api in [Interaction]
                        </a>
                    </div>

                    <div class="inline-block mx-6 mt-4 ring-1 ring-gray-800 rounded ">
                        <table class=" divide-y divide-gray-700">
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
{`type APIBody = {
    activity?: string,
    interaction? : string,
    activityId?: string,
    payload?: {[k: string]: any},
    query?: {  // only for get interaction api
        orderBy?: [string, 'asc' | 'desc'][],
        limit?: number,
        offset?: number,
    }
}`}
</pre>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <div class="flex items-center gap-x-3 px-6 py-4">
                        <h2 class="min-w-0 text-lg font-semibold leading-6 text-white ">
                            <a class="flex gap-x-2 cursor-pointer">
                                Custom API
                            </a>
                        </h2>
                    </div>

                    <div class="flex items-center gap-x-3 px-6 py-4">
                        <h2 class="min-w-0 text-sm font-semibold leading-6 text-white ">
                            <a class="flex gap-x-2 cursor-pointer">
                                Basic Information
                            </a>
                        </h2>
                    </div>

                    <div class=" inline-block  mx-6 mt-4 ring-1 ring-gray-800 rounded">
                        <table class=" divide-y divide-gray-700">
                            <tbody class="divide-y divide-gray-800">
                            <tr class="divide-x divide-gray-800">
                                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">Endpoint</td>
                                <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                    <a class="" >
                                        http://[host]:{PORT}/api/{`{apiName}`}
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
{`type DataAPIBody = any[]`}
</pre>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="flex items-center gap-x-3 px-6 py-4">
                        <h2 class="min-w-0 text-sm font-semibold leading-6 text-white ">
                            <a class="flex gap-x-2 cursor-pointer">
                                Available APIs
                            </a>
                        </h2>
                    </div>

                    <div class="mx-6 mt-4 ring-1 ring-gray-800 rounded">
                            <table class="min-w-full divide-y divide-gray-700">
                                <thead class="">
                                <tr class="divide-x divide-gray-800">
                                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white">API Name</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Params</th>
                                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-white">Allow Anonymous</th>
                                </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-800">
                                {() => Object.entries(dataAPIS() as DataAPIs).map(([name, dataAPI]) => (
                                    <tr class="divide-x divide-gray-800">
                                        <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white ">
                                            <div>
                                                {name}
                                            </div>
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            <div>{dataAPI.params?.join(',')}</div>
                                        </td>
                                        <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                            {dataAPI.allowAnonymous ? 'true' : ''}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                    </div>

                </div>


            </div>






        </main>
    )
}