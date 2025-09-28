package com.tdtuer.eventing.di

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module @InstallIn(SingletonComponent::class)
object AppModule{
    @Provides fun provideFirebaseAuth() = FirebaseAuth.getInstance()
    @Provides fun provideFirestore() = FirebaseFirestore.getInstance()
}