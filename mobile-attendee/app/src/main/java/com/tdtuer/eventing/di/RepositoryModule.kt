package com.tdtuer.eventing.di

import com.tdtuer.eventing.data.auth.AuthRepository
import com.tdtuer.eventing.data.auth.AuthRepositoryImpl // <-- Đảm bảo import này đúng với vị trí file AuthRepositoryImpl của bạn
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class) // Cài đặt module này vào SingletonComponent (phạm vi application)
abstract class RepositoryModule {

    @Binds
    @Singleton // Đảm bảo chỉ có một instance của AuthRepositoryImpl được tạo và sử dụng
    abstract fun bindAuthRepository(
        authRepositoryImpl: AuthRepositoryImpl // Hilt sẽ biết cách tạo AuthRepositoryImpl nếu nó có @Inject constructor
    ): AuthRepository
}
