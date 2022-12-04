import neo4j, { Integer } from "neo4j";

export const calcByJaccardIndex = async (
  driver: neo4j.Driver,
  videoId: string,
  { limit }: { limit: number },
): Promise<{ videoId: string; jaccard: number }[]> => {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (bv:Video {id: $id})-[:TAGGED_BY]->(t:Tag)<-[:TAGGED_BY]-(ov:Video)

      WITH bv, ov, COUNT(t) AS i

      MATCH (bv)-[:TAGGED_BY]->(bvt)
      WITH bv, ov, i, COLLECT(bvt) AS s1c

      MATCH (ov)-[:TAGGED_BY]->(ovt) WHERE NOT ovt in s1c
      WITH bv, ov, i, s1c, COLLECT(ovt) AS s2c

      RETURN ov.id AS id, ((i * 1.0) / (size(s1c) + size(s2c))) AS jaccard
      ORDER BY jaccard DESC, id
      LIMIT $limit
      `,
      { id: videoId, limit: Integer.fromNumber(limit) },
    );
    const parsed = result.records.map((rec) => ({
      videoId: rec.get("id"),
      jaccard: rec.get("jaccard"),
    }));
    return parsed;
  } finally {
    await session.close();
  }
};

// console.dir(await jaccard(driver, "sam6k6wseqhj", { limit: 10 }));
