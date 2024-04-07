# WEB3 README

当前 `feature-add-service-fee` 分支用于 `web3_wallet_flutter` 处理 btc 铭文、符文相关内容，以后有需要其他币种的接入，也可以考虑使用此仓库

## 开始接入
在这个仓库的 `feature-add-service-fee` (按需修改分支)钟处理相关功能内容(比如增加手续费内容)，及时更新[远端内容](https://github.com/okx/js-wallet-sdk)以便修复 bug 或者新增功能。完成之后，前往[这个仓库](https://bitbucket.org/gatewallet/web3-bitcoin-inject-web)进行压缩打包测试:

- 更新相关依赖为当前 repo 内容,eg: https://bitbucket.org/gatewallet/web3-bitcoin-inject-web/src/main/package.json

- 在 `https://bitbucket.org/gatewallet/web3-bitcoin-inject-web/src/main/src/foobar.js` 导出相关使用的模块，模块开头为: `gateXXXLib`.

- 执行打包操作 `yarn && sh build.sh`

- 复制对应打包产物到 `web3_wallet_flutter` 项目`https://bitbucket.org/gatewallet/web3_wallet_flutter/src/7160bd3a070b8d5174cbe0def1d3452e9fe22552/lib/Resource/Scripts/?at=develop%2Fdevelop_1.8.4`，进行测试。对应参考内容:`https://bitbucket.org/gatewallet/web3_wallet_flutter/src/bbd5e957475b602a7a94378c761447fcabd235b5/lib/Util/ContractMethod/jo_script_method.dart?at=build%2Fbuild_1.8.4#lines-249` (主要替换 bitcoinjs.js) 保证**不能丢失原有内容**(可以比对当前版本内容)

- 测试功能入口: `web3_wallet_flutter/lib/Util/WalletCore/Test/PYTest.dart` 中 `brcTest` 以便参考

