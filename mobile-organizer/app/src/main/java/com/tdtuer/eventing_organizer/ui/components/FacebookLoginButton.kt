package com.tdtuer.eventing_organizer.ui.components

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import com.facebook.AccessToken
import com.facebook.CallbackManager
import com.facebook.FacebookCallback
import com.facebook.FacebookException
import com.facebook.login.LoginManager
import com.facebook.login.LoginResult
import com.tdtuer.eventing_organizer.R

@Composable
fun FacebookLoginButton(
    onAuthSuccess: (AccessToken) -> Unit,
    onAuthError: (String?) -> Unit
) {
    val loginManager = LoginManager.getInstance()
    val callbackManager = remember { CallbackManager.Factory.create() }

    val launcher = rememberLauncherForActivityResult(
        contract = loginManager.createLogInActivityResultContract(callbackManager),
        onResult = { /* The result is handled in the callback */ }
    )

    DisposableEffect(Unit) {
        loginManager.registerCallback(callbackManager, object : FacebookCallback<LoginResult> {
            override fun onSuccess(result: LoginResult) {
                onAuthSuccess(result.accessToken)
            }

            override fun onCancel() {
                onAuthError("Facebook login cancelled.")
            }

            override fun onError(error: FacebookException) {
                onAuthError(error.message)
            }
        })

        onDispose {
            loginManager.unregisterCallback(callbackManager)
        }
    }

    SocialLoginButton(
        iconRes = R.drawable.ic_launcher_background,
        text = "Facebook",
        onClick = {
            launcher.launch(listOf("email", "public_profile"))
        }
    )
}
