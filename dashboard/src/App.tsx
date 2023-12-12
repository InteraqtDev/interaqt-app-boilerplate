import {atom, Component, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {Router} from "./utils/router.js";
import {EntityPage} from "./EntityPage.js";
import {InteractionPage} from "./InteractionPage.js";
import {DatabasePage} from "./DatabasePage.js";
import {APIPage} from "./APIPage.js";
import {Match} from "navigo";
import {StatePage} from "./StatePage.js";
import Database from './icons/Database'
import Interaction from "./icons/Interaction.js";
import State from "./icons/State.js";
import Entity from "./icons/Entity.js";
import API from "./icons/API.js";
import {version as runtimeVersion} from '../../node_modules/@interaqt/runtime/package.json'

/* @jsx createElement */
export function App(props: Props, { createElement }: InjectHandles) {

    const router = new Router({
        '/entity': EntityPage as Component,
        '/state': StatePage as Component,
        '/interaction': InteractionPage as Component,
        '/database': DatabasePage as Component,
        '/api': APIPage as Component
    }, {
        defaultPath: '/entity',
        matchAtoms: {
            class: (match: Match) => {
                return [
                    "bg-gray-800 text-white group flex content-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold cursor-pointer align-middle",
                    "text-gray-400 hover:text-white hover:bg-gray-800 group flex content-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold cursor-pointer align-middle"
                ]
            }
        }
    })




    return (
        <div>
            <div class="fixed inset-y-0 z-50 flex w-72 flex-col">
                
                <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-black/10 px-6 ring-1 ring-white/5">
                    <div class="">
                        <img class="h-8 w-auto mt-4" src="../assets/logo-white.svg" alt="Interaqt"/>
                        <div class="text-white mt-2">
                            {runtimeVersion}
                        </div>
                    </div>

                    <nav class="flex flex-1 flex-col">
                        <ul role="list" class="flex flex-1 flex-col gap-y-7">
                            <li>
                                <ul role="list" class="-mx-2 space-y-1">
                                    <li>
                                        <a onClick={router.genGoto('/entity')} class={router.genAtoms('/entity', 'class')}>
                                            <Entity />
                                            Entity & Relation
                                        </a>
                                    </li>
                                    <li>
                                        <a onClick={router.genGoto('/state')} class={router.genAtoms('/state', 'class')}>
                                            <State />
                                            State
                                        </a>
                                    </li>
                                    <li>
                                        <a onClick={router.genGoto('/interaction')} class={router.genAtoms('/interaction', 'class')}>
                                            <Interaction />
                                            Interaction
                                        </a>
                                    </li>
                                    <li>
                                        <a  onClick={router.genGoto('/api')} class={router.genAtoms('/api', 'class')}>
                                            <API />
                                            API
                                        </a>
                                    </li>
                                    <li>
                                        <a onClick={router.genGoto('/database')} class={router.genAtoms('/database', 'class')}>
                                            <Database />
                                            Database
                                        </a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>

            <div class="pl-72">
                {router.render(createElement)}
            </div>
        </div>
    )
}