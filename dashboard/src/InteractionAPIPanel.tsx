import {atom, InjectHandles} from "axii";
import {Interaction, KlassInstance} from "@interaqt/shared";
import {Code} from './utils/code/Code.js'
import {PORT} from "../../config.js";
import {getExampleValueForRecord, renderAttributives} from "./common.js";
import {MapData} from "@interaqt/storage";
import {post} from "./utils/post.js";


export default function InteractionAPIPanel({
    interaction = atom<KlassInstance<typeof Interaction, false>>(null),
    map = atom<MapData>(null)
}, {createElement}: InjectHandles

) {


    const initialBody = {
        interaction: interaction()?.name,
        payload: interaction()?.payload?.items.reduce((acc, item) => {
            const exampleItem = item.isRef ? {"id": 1} : getExampleValueForRecord(map()!.records[item.base.name]!)

            acc[item.name] = item.isCollection? [exampleItem] : exampleItem
            return acc
        }, {} as any)
    }

    const value = atom(JSON.stringify(initialBody, null, 2))
    const sending = atom<boolean>(false)
    const editorRef = atom<any>(null)
    const result = atom<any>(null)
    const error = atom<any>(null)
    const xUserId = atom(1)
    const onClickSend = async () => {
        sending(true)
        try {
            const newValue = editorRef()?.getValue()
            result(await post(`/interaction`, JSON.parse(newValue), xUserId().toString()))
        } catch (e) {
            error(e)
        }
        sending(false)
    }


    return <div>
        <div class="mt-4 ring-1 ring-gray-200 sm:rounded-lg">
            <table class="min-w-full divide-y divide-gray-700">
                <tbody class="divide-y divide-gray-200">
                <tr class="divide-x divide-gray-200">
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">Endpoint</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">
                        <a class="" >
                            http://[host]:{PORT}/interaction
                        </a>
                    </td>
                </tr>
                <tr class="divide-x divide-gray-200">
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">method</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">
                        <a class="">
                            POST
                        </a>
                    </td>
                </tr>
                <tr class="divide-x divide-gray-200">
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">x-user-id</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">
                        <input value={xUserId} onchange={(e:InputEvent) => xUserId((e.target as HTMLInputElement)!.value)} type="text" name="x-user-id" id="x-user-id" class="inline-block px-1.5 outline-0 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6" />
                    </td>
                </tr>
                <tr class="divide-x divide-gray-200">
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">payload</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">
                        <ul class="list-disc ml-3">
                            {interaction()!.payload?.items.map(item => (
                                <li>{item.name}: {renderAttributives(item.attributives)} {item.base.name} {item.isRef ? '[Reference]' : '[New]'}</li>
                            ))}
                        </ul>
                    </td>
                </tr>
                <tr class="divide-x divide-gray-200">
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-800">Body</td>
                    <td class="">
<Code value={value} handle={editorRef} options={{language: 'json'}}/>
                    </td>
                </tr>
                </tbody>
            </table>
        </div>

        <div class="mt-6">
            <button disabled={sending} onClick={onClickSend} type="button" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:bg-indigo-500 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                {() => sending() ? 'Sending...' : 'Send'}
            </button>
        </div>

        <div class="mt-6">
            {() => error() ? <div class="rounded-md bg-red-50 p-4 mb-6">An error occurred while sending the request, please check the console.</div> : null}
            <div class="relative">
                <div class="absolute inset-0 flex items-center" aria-hidden="true">
                    <div class="w-full border-t border-gray-300"></div>
                </div>
                <div class="relative flex justify-start">
                    <span class="bg-white pr-3 text-base font-semibold leading-6 text-gray-900">Projects</span>
                </div>
            </div>
            <div class="rounded-md bg-blue-50 p-4 mt-6">
                <pre>
                {() => JSON.stringify(result(), null, 2)}
            </pre>
            </div>
        </div>
    </div>
}