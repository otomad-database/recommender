# Recommender

## Setup

事前準備として，`http://localhost:8080/graphql`に[API](https://github.com/otomad-database/api)を立てておく

```bash
cp .env.example > .env
docker compose up -d

deno task dataload
deno task dev # deno task run
```

## Implemented

### `Recommender/GetSimilarVideos`

動画に紐付いたタグに対して単純なJaccard係数を類似度として計算し，上位`n`個のvideoIdとスコア（前述で計算した係数）のペアを返却．
