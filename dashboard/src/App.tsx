import {atom, Component, InjectHandles, Props} from 'axii'
import {post} from './utils/post.js';
import {Router} from "./utils/router.js";
import {EntityPage} from "./EntityPage.js";
import {InteractionPage} from "./InteractionPage.js";
import {DatabasePage} from "./DatabasePage.js";
import {APIPage} from "./APIPage.js";
import {Match} from "navigo";
import { createInstances } from "@interaqt/shared";

/* @jsx createElement */
export function App(props: Props, { createElement }: InjectHandles) {

    const router = new Router({
        '/entity': EntityPage as Component,
        '/interaction': InteractionPage as Component,
        '/database': DatabasePage as Component,
        '/api': APIPage as Component
    }, {
        defaultPath: '/entity',
        matchAtoms: {
            class: (match: Match) => {
                return [
                    "bg-gray-800 text-white group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold",
                    "text-gray-400 hover:text-white hover:bg-gray-800 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                ]
            }
        }
    })




    return (
        <div>
            <div class="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
                
                <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-black/10 px-6 ring-1 ring-white/5">
                    <div class="flex h-16 shrink-0 items-center">
                        <img class="h-8 w-auto" src="../assets/logo-white.svg" alt="Interaqt"/>
                    </div>
                    <nav class="flex flex-1 flex-col">
                        <ul role="list" class="flex flex-1 flex-col gap-y-7">
                            <li>
                                <ul role="list" class="-mx-2 space-y-1">
                                    <li>
                                        <a href="#" onClick={router.genGoto('/entity')} class={router.genAtoms('/entity', 'class')}>
                                            <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                            </svg>
                                            Entity & Relation
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" onClick={router.genGoto('/interaction')} class={router.genAtoms('/interaction', 'class')}>
                                            <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
                                            </svg>
                                            Interaction
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#"  onClick={router.genGoto('/api')} class={router.genAtoms('/api', 'class')}>
                                            <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                            </svg>
                                            API
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" onClick={router.genGoto('/database')} class={router.genAtoms('/database', 'class')}>
                                            <svg class="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                                            </svg>
                                            Database
                                        </a>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>

            <div class="xl:pl-72">
                {router.render(createElement)}
            </div>
        </div>
    )
}