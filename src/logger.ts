import Pino from "pino";
import pretty from "pino-pretty";

const logger = Pino(
   process.env.NODE_ENV !== "production"
      ? pretty({
           ignore: "pid,hostname",
        })
      : undefined,
);

export default logger;
