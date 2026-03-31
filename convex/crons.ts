import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("check-queue", { minutes: 30 }, internal.queue.checkAndNotify);
crons.interval("detect-dead-agents", { minutes: 5 }, internal.agents.detectDeadAgents);

export default crons;
