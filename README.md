# threejs

Session 06「モデル読み込みと外部リソース」のサンプルです。

## このサンプルでやっていること

- `GLTFLoader` で `robot.glb` を読み込みます
- `GLTFLoader` で `Altar01_Art.glb` を読み込みます
- モデルを `Box3` で中心補正し、床に接地するように配置します
- マウスでメッシュを選択し、ハイライト表示します

## 実行方法

作業ディレクトリを `src` にして実行します。

```bash
cd src
npm install
npm run dev
```

## モデル読み込みの優先順

1. `/models/Altar01_Art.glb`（ローカル）

このサンプルはローカルファイルのみを読み込みます。

## 読み込みに失敗した場合

`/models/Altar01_Art.glb` が見つからないと、コンソールにエラーが表示されます。

- 例: `Failed to load model: /models/Altar01_Art.glb`

## 期待される見た目（想定結果）

- 空と床が表示される
- 中央付近にモデルが 1 体表示される
- モデルはゆっくり回転する
- OrbitControls でカメラを回転・ズームできる
- モデルをクリックするとハイライト色が変わる

## Altar01_Art.glb を使いたい場合

1. `src/public/models` フォルダを作成
2. その中に `Altar01_Art.glb` を配置
3. ブラウザを再読み込み

`/models/Altar01_Art.glb` が見つかればモデルが表示されます。