import { error, Status } from "grpc/error.ts";
import { GrpcServer } from "grpc/server.ts";
import neo4j from "neo4j";
import { calcByJaccardIndex } from "./jaccard.ts";
import { Recommender } from "./recommender.d.ts";

const port = 50051;
const server = new GrpcServer();

const protoPath = new URL("./recommender.proto", import.meta.url);
const protoFile = await Deno.readTextFile(protoPath);

const neo4jDriver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("neo4j", "password"),
);

server.addService<Recommender>(protoFile, {
  async GetSimilarVideos({ videoId, limit }) {
    if (!videoId) throw error(Status.INVALID_ARGUMENT);
    if (!limit) throw error(Status.INVALID_ARGUMENT);

    try {
      const similarities = await calcByJaccardIndex(neo4jDriver, videoId, { limit });
      return { similarities: similarities };
    } catch {
      throw error(Status.UNAVAILABLE);
    }
  },
});

console.log(`gonna listen on ${port} port`);
for await (const conn of Deno.listen({ port })) {
  server.handle(conn);
}
