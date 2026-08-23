import Flutter
import UIKit

class SceneDelegate: FlutterSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    ClefSharedImportBridge.shared.handle(urlContexts: connectionOptions.urlContexts)
    super.scene(scene, willConnectTo: session, options: connectionOptions)
  }

  override func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    ClefSharedImportBridge.shared.handle(urlContexts: URLContexts)
    super.scene(scene, openURLContexts: URLContexts)
  }
}
