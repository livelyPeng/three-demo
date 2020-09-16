日照模拟场景

lib文件夹中为第三方库

src文件夹为源代码文件
1.ThreeNode 主场景文件
2.Events 场景事件文件
3.PublicFun 场景非3D方法文件
4.SunCalcuate 太阳相关计算方法及参数
5.PublicThree 场景3D相关方法、参数及对象

js文件夹中为调用函数说明




// 1.首先说一点，因为这是cdn方式在用静态html写vue，所以无需用到webpack启动node服务，这不是框架项目。我们用webpack仅此为了打个JS包，吧es6打包成es5。
// 2. 因为啥是静态页面所以无需使用webpack-dev-server。无需npm run dev。

// 如何启动？
0. npm i
1. 你只管编辑dist里面的html, 编辑src下面关于three的逻辑文件，然后npm run build，
2. 然后你只需要点开dist里面的html即可。
3. 你编辑src下面关于three的逻辑文件，记得npm run build，

4. 发布？你只需要吧dist文件复制放到线上即可！

注意：不在需要你直接把images文件复制，不在需要吧lib文件复制，进去dist里面。你什么都不需要做了、
