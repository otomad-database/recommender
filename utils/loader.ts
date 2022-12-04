import neo4j from "neo4j";
import { gql, request } from "graphql-request";

const query = gql`
  query {
    videos(input: {limit: 100}) {
      nodes {
        id
        title
        tags {
          id
          name
        }
      }
    }
  }
`;

const data = await request<
  { videos: { nodes: { id: string; title: string; tags: { id: string; name: string }[] }[] } }
>(Deno.env.get("GRAPHQL_API_ENDPOINT")!, query);

const videos = data.videos.nodes.map(
  ({ id: videoId, tags, title }) => ({
    id: videoId,
    title,
    tags: tags.map(({ id, name }) => ({ id, name })),
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
  for (const video of videos) {
    await session.run(
      `
      MERGE (v:Video {id: $id})
      SET v.title = $title
      RETURN v
      `,
      { id: video.id, title: video.title },
    );
    for (const tag of video.tags) {
      await session.run(
        `
        MATCH (v:Video {id: $video_id})
        MERGE (t:Tag {id: $tag_id})
        SET t.name = $name
        MERGE (v)-[:TAGGED_BY]->(t)
        RETURN t
        `,
        { tag_id: tag.id, video_id: video.id, name: tag.name },
      );
    }
  }
} catch (e) {
  console.dir(e);
} finally {
  await session.close();
}

await neo4jDriver.close();
