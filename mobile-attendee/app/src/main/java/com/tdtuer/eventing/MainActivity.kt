package com.tdtuer.eventing

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.ui.navigation.RootNavigationGraph
import com.tdtuer.eventing.ui.theme.EventingTheme
import dagger.hilt.android.AndroidEntryPoint
import android.util.Log
import androidx.compose.runtime.LaunchedEffect
import com.tdtuer.eventing.domain.usecase.events.GetAllEventsUseCase
import javax.inject.Inject
import com.tdtuer.eventing.domain.model.Result
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject
    lateinit var getAllEventsUseCase: GetAllEventsUseCase

    override fun onCreate(savedInstanceState: Bundle?) {

        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val intent = this.intent
        setContent {
            EventingTheme {
//
//                LaunchedEffect(key1 = true) {
//                    val tag = "RetrofitTest"
//
//                    Log.d(tag, "Dang goi GetAllEventUsecase")
//
//                    getAllEventsUseCase().collect { result ->
//                        Log.d(tag, "dawiodawjoidioajad")
//                        when (result) {
//                            is Result.Success<*> -> {
////                                Log.d(tag, "Success ${result.data.size}")
//                                Log.d(tag, "${result.data}")
//                            }
//
//                            is Result.Failure -> {
//                                Log.d(tag, "Error ${result.exception.message}")
//                            }
//
//                            is Result.Loading -> {
//                                Log.d(tag, "Loading")
//                            }
//                        }
//                    }
//                }

                val navController = rememberNavController()
                RootNavigationGraph(navController = navController, intent = intent)
            }
        }
    }
}
