import { createRouter, createWebHistory } from "vue-router"

import CoverView from "../views/CoverView.vue"
import MembersView from "../views/MembersView.vue"
import TimelineView from "../views/TimelineView.vue"
import UploadView from "../views/UploadView.vue"
import WallView from "../views/WallView.vue"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/cover" },
    { path: "/cover", component: CoverView },
    { path: "/members", component: MembersView },
    { path: "/upload", component: UploadView },
    { path: "/timeline", component: TimelineView },
    { path: "/wall", component: WallView },
  ],
})

export default router
