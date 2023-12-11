import {atom, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {createInstances, Entity, KlassInstance, Interaction,Property} from "@interaqt/shared";

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
                <h1 class="text-base font-semibold leading-7 text-white">Entity & Relation</h1>
            </header>

            <ul role="list" class="divide-y divide-white/5">
                {() => {
                    return instancesByName().Interaction?.map((interaction: KlassInstance<typeof Interaction, false>) => (
                        <li class="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div class="min-w-0 flex-auto">
                                <div class="flex items-center gap-x-3">
                                    <h2 class="min-w-0 text-sm font-semibold leading-6 text-white">
                                        <a href="#" class="flex gap-x-2">
                                            <span class="truncate">{interaction.name}</span>
                                        </a>
                                    </h2>
                                </div>
                            </div>
                        </li>
                    ))
                }}


            </ul>
        </main>
    )
}