import neo4j from "neo4j";
import { gql, request } from "graphql-request";

const query = gql`
  query {
    tags(input: { limit: 100 }) {
      nodes {
        id
        name
        taggedVideos {
          id
          title
        }
      }
    }
  }
`;

const data = await request<
  { tags: { nodes: { id: string; name: string; taggedVideos: { id: string; title: string }[] }[] } }
>(Deno.env.get("GRAPHQL_API_ENDPOINT")!, query);

const tags = data.tags.nodes.map(
  ({ id: videoId, name, taggedVideos }) => ({
    id: videoId,
    name,
    taggedVideos: taggedVideos.map(({ id, title }) => ({ id, title })),
  }),
);

const neo4jDriver = neo4j.driver(
  Deno.env.get("NEO4J_URL")!,
  neo4j.auth.basic(
    Deno.env.get("NEO4J_USERNAME")!,
    Deno.env.get("NEO4J_PASSWORD")!,
  ),
);

const session = neo4jDriver.session();
try {
  await session.run("MATCH (n) DETACH DELETE n");
  for (const tag of tags) {
    await session.run(
      `
      MERGE (t:Tag {id: $id})
      SET t.name = $name
      RETURN t
      `,
      { id: tag.id.split(":").at(1)!, name: tag.name },
    );
    for (const video of tag.taggedVideos) {
      await session.run(
        `
        MATCH (t:Tag {id: $tag_id})
        MERGE (v:Video {id: $video_id})
        SET v.title = $title
        MERGE (v)-[:TAGGED_BY]->(t)
        RETURN t
        `,
        {
          tag_id: tag.id.split(":").at(1)!,
          video_id: video.id.split(":").at(1)!,
          title: video.title,
        },
      );
    }
  }
} catch (e) {
  console.dir(e);
} finally {
  await session.close();
}

await neo4jDriver.close();
