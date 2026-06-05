# Rent Flow - Android MVP Codebase

This file contains the complete Kotlin codebase for the "Rent Flow" Android application using Jetpack Compose, Room, and MVVM.

## 1. Gradle Dependencies (`build.gradle.kts` - Module :app)

```kotlin
dependencies {
    val room_version = "2.6.1"
    val nav_version = "2.7.7"
    val work_version = "2.9.0"
    val lifecycle_version = "2.7.0"

    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:$nav_version")
    
    // Room
    implementation("androidx.room:room-runtime:$room_version")
    implementation("androidx.room:room-ktx:$room_version")
    ksp("androidx.room:room-compiler:$room_version")
    
    // ViewModel & Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:$lifecycle_version")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:$lifecycle_version")
    
    // WorkManager
    implementation("androidx.work:work-runtime-ktx:$work_version")
}
```

## 2. Database Schema (Entities & DAOs)

### `TenantEntity.kt`
```kotlin
package com.example.rentflow.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tenants")
data class TenantEntity(
    @PrimaryKey(autoGenerate = true) val tenantId: Long = 0,
    val photoUri: String?,
    val name: String,
    val mobileNumber: String,
    val nidNumber: String,
    val flatNumber: String,
    val monthlyRent: Double,
    val dueDateDay: Int,
    val advanceAmount: Double = 0.0,
    val isActive: Boolean = true
)
```

### `PaymentEntity.kt`
```kotlin
package com.example.rentflow.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "payments",
    foreignKeys = [
        ForeignKey(
            entity = TenantEntity::class,
            parentColumns = ["tenantId"],
            childColumns = ["tenantId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("tenantId")]
)
data class PaymentEntity(
    @PrimaryKey(autoGenerate = true) val paymentId: Long = 0,
    val tenantId: Long,
    val monthYear: String, // Format: "MM-YYYY"
    val amountPaid: Double,
    val paymentDate: Long
)
```

### `TenantDao.kt`
```kotlin
package com.example.rentflow.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.example.rentflow.data.local.entity.TenantEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TenantDao {
    @Insert
    suspend fun insertTenant(tenant: TenantEntity): Long

    @Update
    suspend fun updateTenant(tenant: TenantEntity)

    @Query("SELECT * FROM tenants WHERE isActive = 1")
    fun getActiveTenants(): Flow<List<TenantEntity>>

    @Query("SELECT * FROM tenants WHERE tenantId = :id")
    fun getTenantById(id: Long): Flow<TenantEntity?>
    
    @Query("SELECT * FROM tenants")
    fun getAllTenants(): Flow<List<TenantEntity>>
}
```

### `PaymentDao.kt`
```kotlin
package com.example.rentflow.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.example.rentflow.data.local.entity.PaymentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentDao {
    @Insert
    suspend fun insertPayment(payment: PaymentEntity)

    @Query("SELECT * FROM payments WHERE tenantId = :tenantId ORDER BY paymentDate DESC")
    fun getPaymentsForTenant(tenantId: Long): Flow<List<PaymentEntity>>

    @Query("SELECT * FROM payments WHERE monthYear = :monthYear")
    fun getPaymentsForMonth(monthYear: String): Flow<List<PaymentEntity>>
    
    @Query("SELECT SUM(amountPaid) FROM payments WHERE tenantId = :tenantId")
    fun getTotalPaidByTenant(tenantId: Long): Flow<Double?>
}
```

### `AppDatabase.kt`
```kotlin
package com.example.rentflow.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.rentflow.data.local.dao.PaymentDao
import com.example.rentflow.data.local.dao.TenantDao
import com.example.rentflow.data.local.entity.PaymentEntity
import com.example.rentflow.data.local.entity.TenantEntity

@Database(entities = [TenantEntity::class, PaymentEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun tenantDao(): TenantDao
    abstract fun paymentDao(): PaymentDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "rentflow_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

## 3. Repository Layer

### `RentRepository.kt`
```kotlin
package com.example.rentflow.data.repository

import com.example.rentflow.data.local.dao.PaymentDao
import com.example.rentflow.data.local.dao.TenantDao
import com.example.rentflow.data.local.entity.PaymentEntity
import com.example.rentflow.data.local.entity.TenantEntity
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class RentRepository(
    private val tenantDao: TenantDao,
    private val paymentDao: PaymentDao
) {
    fun getActiveTenants() = tenantDao.getActiveTenants()
    fun getAllTenants() = tenantDao.getAllTenants()
    fun getTenantById(id: Long) = tenantDao.getTenantById(id)
    fun getPaymentsForTenant(tenantId: Long) = paymentDao.getPaymentsForTenant(tenantId)
    fun getTotalPaidByTenant(tenantId: Long) = paymentDao.getTotalPaidByTenant(tenantId)

    suspend fun addTenant(tenant: TenantEntity) = tenantDao.insertTenant(tenant)
    suspend fun updateTenant(tenant: TenantEntity) = tenantDao.updateTenant(tenant)
    suspend fun addPayment(payment: PaymentEntity) = paymentDao.insertPayment(payment)

    fun getCurrentMonthYear(): String {
        val sdf = SimpleDateFormat("MM-yyyy", Locale.getDefault())
        return sdf.format(Date())
    }

    fun getDashboardStats(): Flow<DashboardStats> {
        val currentMonthYear = getCurrentMonthYear()
        val activeTenantsFlow = tenantDao.getActiveTenants()
        val currentMonthPaymentsFlow = paymentDao.getPaymentsForMonth(currentMonthYear)

        return combine(activeTenantsFlow, currentMonthPaymentsFlow) { tenants, payments ->
            var totalCollected = 0.0
            var totalDue = 0.0
            var paidCount = 0
            var dueCount = 0

            val calendar = Calendar.getInstance()
            val currentDay = calendar.get(Calendar.DAY_OF_MONTH)

            tenants.forEach { tenant ->
                val tenantPayments = payments.filter { it.tenantId == tenant.tenantId }
                val paidThisMonth = tenantPayments.sumOf { it.amountPaid }
                
                totalCollected += paidThisMonth
                
                val dueForTenant = tenant.monthlyRent - paidThisMonth
                if (dueForTenant > 0) {
                    totalDue += dueForTenant
                    dueCount++
                } else {
                    paidCount++
                }
            }

            DashboardStats(
                totalActiveTenants = tenants.size,
                paidTenantsCount = paidCount,
                dueTenantsCount = dueCount,
                totalRentCollected = totalCollected,
                totalOutstandingDue = totalDue
            )
        }
    }
}

data class DashboardStats(
    val totalActiveTenants: Int = 0,
    val paidTenantsCount: Int = 0,
    val dueTenantsCount: Int = 0,
    val totalRentCollected: Double = 0.0,
    val totalOutstandingDue: Double = 0.0
)

enum class RentStatus {
    PAID, DUE_SOON, OVERDUE
}

fun calculateRentStatus(tenant: TenantEntity, amountPaidThisMonth: Double, currentDay: Int): RentStatus {
    if (amountPaidThisMonth >= tenant.monthlyRent) return RentStatus.PAID
    if (currentDay > tenant.dueDateDay) return RentStatus.OVERDUE
    if (tenant.dueDateDay - currentDay <= 3) return RentStatus.DUE_SOON
    return RentStatus.PAID // Default to paid/fine if not due soon and not overdue
}
```

## 4. ViewModels

### `DashboardViewModel.kt`
```kotlin
package com.example.rentflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.rentflow.data.repository.DashboardStats
import com.example.rentflow.data.repository.RentRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import java.util.Calendar

class DashboardViewModel(private val repository: RentRepository) : ViewModel() {
    val dashboardStats: StateFlow<DashboardStats> = repository.getDashboardStats()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardStats())

    fun getDaysRemainingInMonth(): Int {
        val calendar = Calendar.getInstance()
        val currentDay = calendar.get(Calendar.DAY_OF_MONTH)
        val maxDays = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)
        return maxDays - currentDay
    }
}

class DashboardViewModelFactory(private val repository: RentRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(DashboardViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return DashboardViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
```

### `TenantViewModel.kt`
```kotlin
package com.example.rentflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.rentflow.data.local.entity.PaymentEntity
import com.example.rentflow.data.local.entity.TenantEntity
import com.example.rentflow.data.repository.RentRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class TenantViewModel(private val repository: RentRepository) : ViewModel() {
    val activeTenants: StateFlow<List<TenantEntity>> = repository.getActiveTenants()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun getTenantById(id: Long): StateFlow<TenantEntity?> = repository.getTenantById(id)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun getPaymentsForTenant(id: Long): StateFlow<List<PaymentEntity>> = repository.getPaymentsForTenant(id)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
        
    fun getTotalPaidByTenant(id: Long): StateFlow<Double?> = repository.getTotalPaidByTenant(id)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)
}

class TenantViewModelFactory(private val repository: RentRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(TenantViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return TenantViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
```

### `AdminViewModel.kt`
```kotlin
package com.example.rentflow.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.rentflow.data.local.entity.PaymentEntity
import com.example.rentflow.data.local.entity.TenantEntity
import com.example.rentflow.data.repository.RentRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class AdminViewModel(private val repository: RentRepository) : ViewModel() {
    val allTenants: StateFlow<List<TenantEntity>> = repository.getAllTenants()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addTenant(tenant: TenantEntity) {
        viewModelScope.launch {
            repository.addTenant(tenant)
        }
    }

    fun updateTenantStatus(tenant: TenantEntity, isActive: Boolean) {
        viewModelScope.launch {
            repository.updateTenant(tenant.copy(isActive = isActive))
        }
    }

    fun addPayment(tenantId: Long, monthYear: String, amount: Double) {
        viewModelScope.launch {
            val payment = PaymentEntity(
                tenantId = tenantId,
                monthYear = monthYear,
                amountPaid = amount,
                paymentDate = System.currentTimeMillis()
            )
            repository.addPayment(payment)
        }
    }
}

class AdminViewModelFactory(private val repository: RentRepository) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(AdminViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return AdminViewModel(repository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
```

## 5. UI Composables

### `Navigation.kt`
```kotlin
package com.example.rentflow.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.example.rentflow.ui.screens.*

sealed class Screen(val route: String, val title: String, val icon: @Composable () -> Unit) {
    object Dashboard : Screen("dashboard", "Dashboard", { Icon(Icons.Filled.Dashboard, contentDescription = null) })
    object Tenants : Screen("tenants", "Tenants", { Icon(Icons.Filled.Group, contentDescription = null) })
    object Admin : Screen("admin", "Admin", { Icon(Icons.Filled.Settings, contentDescription = null) })
    object TenantProfile : Screen("tenantProfile/{tenantId}", "Profile", { }) {
        fun createRoute(tenantId: Long) = "tenantProfile/$tenantId"
    }
}

@Composable
fun RentFlowApp(
    dashboardViewModel: DashboardViewModel,
    tenantViewModel: TenantViewModel,
    adminViewModel: AdminViewModel
) {
    val navController = rememberNavController()
    val items = listOf(Screen.Dashboard, Screen.Tenants, Screen.Admin)

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { screen ->
                    NavigationBarItem(
                        icon = screen.icon,
                        label = { Text(screen.title) },
                        selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(navController, startDestination = Screen.Dashboard.route, Modifier.padding(innerPadding)) {
            composable(Screen.Dashboard.route) { DashboardScreen(dashboardViewModel) }
            composable(Screen.Tenants.route) { TenantListScreen(tenantViewModel, navController) }
            composable(Screen.Admin.route) { AdminPanelScreen(adminViewModel) }
            composable(
                route = Screen.TenantProfile.route,
                arguments = listOf(navArgument("tenantId") { type = NavType.LongType })
            ) { backStackEntry ->
                val tenantId = backStackEntry.arguments?.getLong("tenantId") ?: return@composable
                TenantProfileScreen(tenantId, tenantViewModel, navController)
            }
        }
    }
}
```

### `DashboardScreen.kt`
```kotlin
package com.example.rentflow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.rentflow.ui.viewmodel.DashboardViewModel

@Composable
fun DashboardScreen(viewModel: DashboardViewModel) {
    val stats by viewModel.dashboardStats.collectAsState()
    val daysRemaining = viewModel.getDaysRemainingInMonth()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Dashboard", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        Card(modifier = Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Days remaining in month", style = MaterialTheme.typography.titleMedium)
                Text("$daysRemaining Days", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatCard(title = "Active Tenants", value = stats.totalActiveTenants.toString(), modifier = Modifier.weight(1f))
            StatCard(title = "Paid", value = stats.paidTenantsCount.toString(), color = Color(0xFF4CAF50), modifier = Modifier.weight(1f))
            StatCard(title = "Due", value = stats.dueTenantsCount.toString(), color = Color(0xFFF44336), modifier = Modifier.weight(1f))
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        StatCard(title = "Total Collected (This Month)", value = "$${stats.totalRentCollected}", modifier = Modifier.fillMaxWidth())
        Spacer(modifier = Modifier.height(8.dp))
        StatCard(title = "Total Outstanding Due", value = "$${stats.totalOutstandingDue}", color = Color(0xFFF44336), modifier = Modifier.fillMaxWidth())
    }
}

@Composable
fun StatCard(title: String, value: String, color: Color = MaterialTheme.colorScheme.onSurface, modifier: Modifier = Modifier) {
    Card(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.bodyMedium)
            Text(value, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = color)
        }
    }
}
```

### `TenantListScreen.kt`
```kotlin
package com.example.rentflow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.example.rentflow.data.local.entity.TenantEntity
import com.example.rentflow.ui.Screen
import com.example.rentflow.ui.viewmodel.TenantViewModel

@Composable
fun TenantListScreen(viewModel: TenantViewModel, navController: NavController) {
    val tenants by viewModel.activeTenants.collectAsState()

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Active Tenants", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))
        
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(tenants) { tenant ->
                TenantCard(tenant) {
                    navController.navigate(Screen.TenantProfile.createRoute(tenant.tenantId))
                }
            }
        }
    }
}

@Composable
fun TenantCard(tenant: TenantEntity, onClick: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(modifier = Modifier.size(50.dp).clip(CircleShape), color = MaterialTheme.colorScheme.secondaryContainer) {
                Icon(Icons.Filled.Person, contentDescription = null, modifier = Modifier.padding(12.dp))
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(tenant.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Flat: ${tenant.flatNumber} | Rent: $${tenant.monthlyRent}", style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
```

### `TenantProfileScreen.kt`
```kotlin
package com.example.rentflow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.example.rentflow.ui.viewmodel.TenantViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TenantProfileScreen(tenantId: Long, viewModel: TenantViewModel, navController: NavController) {
    val tenant by viewModel.getTenantById(tenantId).collectAsState()
    val payments by viewModel.getPaymentsForTenant(tenantId).collectAsState()
    val totalPaid by viewModel.getTotalPaidByTenant(tenantId).collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tenant Profile") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        tenant?.let { t ->
            LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
                item {
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                Text(t.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                                Badge(containerColor = if (t.isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error) {
                                    Text(if (t.isActive) "Active" else "Moved Out")
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Mobile: ${t.mobileNumber}")
                            Text("NID: ${t.nidNumber}")
                            Text("Flat: ${t.flatNumber}")
                            Text("Monthly Rent: $${t.monthlyRent}")
                            Text("Advance Deposit: $${t.advanceAmount}")
                            Text("Due Date: ${t.dueDateDay}th of month")
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Payment Summary", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Total Paid (All Time): $${totalPaid ?: 0.0}")
                            if (payments.isNotEmpty()) {
                                val sdf = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                                Text("Last Payment: ${sdf.format(Date(payments.first().paymentDate))}")
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Payment History", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                
                items(payments) { payment ->
                    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        Row(modifier = Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(payment.monthYear, fontWeight = FontWeight.Bold)
                            Text("$${payment.amountPaid}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
```

### `AdminPanelScreen.kt`
```kotlin
package com.example.rentflow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.rentflow.data.local.entity.TenantEntity
import com.example.rentflow.ui.viewmodel.AdminViewModel
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPanelScreen(viewModel: AdminViewModel) {
    var name by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var nid by remember { mutableStateOf("") }
    var flat by remember { mutableStateOf("") }
    var rent by remember { mutableStateOf("") }
    var advance by remember { mutableStateOf("") }
    var dueDay by remember { mutableStateOf("") }

    var selectedTenantId by remember { mutableStateOf<Long?>(null) }
    var paymentAmount by remember { mutableStateOf("") }
    var paymentMonthYear by remember { mutableStateOf(SimpleDateFormat("MM-yyyy", Locale.getDefault()).format(Date())) }

    val allTenants by viewModel.allTenants.collectAsState()
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp).verticalScroll(rememberScrollState())) {
        Text("Admin Panel", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(16.dp))

        // Add Tenant Section
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Add New Tenant", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = mobile, onValueChange = { mobile = it }, label = { Text("Mobile") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                OutlinedTextField(value = nid, onValueChange = { nid = it }, label = { Text("NID") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = flat, onValueChange = { flat = it }, label = { Text("Flat Number") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = rent, onValueChange = { rent = it }, label = { Text("Monthly Rent") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(value = advance, onValueChange = { advance = it }, label = { Text("Advance Amount (Deposit)") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(value = dueDay, onValueChange = { dueDay = it }, label = { Text("Due Date (Day of Month)") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = {
                    if (name.isNotBlank() && rent.isNotBlank() && dueDay.isNotBlank()) {
                        viewModel.addTenant(
                            TenantEntity(
                                name = name, mobileNumber = mobile, nidNumber = nid,
                                flatNumber = flat, monthlyRent = rent.toDoubleOrNull() ?: 0.0,
                                dueDateDay = dueDay.toIntOrNull() ?: 1, advanceAmount = advance.toDoubleOrNull() ?: 0.0, photoUri = null
                            )
                        )
                        name = ""; mobile = ""; nid = ""; flat = ""; rent = ""; advance = ""; dueDay = ""
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                    Text("Save Tenant")
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Rent Payment Entry
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Enter Rent Payment", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                
                ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                    OutlinedTextField(
                        value = allTenants.find { it.tenantId == selectedTenantId }?.name ?: "Select Tenant",
                        onValueChange = {}, readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        allTenants.filter { it.isActive }.forEach { tenant ->
                            DropdownMenuItem(
                                text = { Text(tenant.name) },
                                onClick = { selectedTenantId = tenant.tenantId; expanded = false }
                            )
                        }
                    }
                }
                
                OutlinedTextField(value = paymentMonthYear, onValueChange = { paymentMonthYear = it }, label = { Text("Month-Year (MM-YYYY)") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(value = paymentAmount, onValueChange = { paymentAmount = it }, label = { Text("Amount Paid") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = {
                    selectedTenantId?.let { id ->
                        val amount = paymentAmount.toDoubleOrNull()
                        if (amount != null && paymentMonthYear.isNotBlank()) {
                            viewModel.addPayment(id, paymentMonthYear, amount)
                            paymentAmount = ""
                        }
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                    Text("Mark as Paid")
                }
            }
        }
    }
}
```

## 6. WorkManager (Notifications)

### `RentReminderWorker.kt`
```kotlin
package com.example.rentflow.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.rentflow.R
import com.example.rentflow.data.local.AppDatabase
import kotlinx.coroutines.flow.first
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class RentReminderWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    override suspend fun doWork(): Result {
        val database = AppDatabase.getDatabase(context)
        val tenantDao = database.tenantDao()
        val paymentDao = database.paymentDao()

        val activeTenants = tenantDao.getActiveTenants().first()
        val calendar = Calendar.getInstance()
        val currentDay = calendar.get(Calendar.DAY_OF_MONTH)
        
        val sdf = SimpleDateFormat("MM-yyyy", Locale.getDefault())
        val currentMonthYear = sdf.format(Date())
        
        val paymentsThisMonth = paymentDao.getPaymentsForMonth(currentMonthYear).first()

        activeTenants.forEach { tenant ->
            // Check if due date is exactly 3 days away
            if (tenant.dueDateDay - currentDay == 3) {
                val tenantPayments = paymentsThisMonth.filter { it.tenantId == tenant.tenantId }
                val paidAmount = tenantPayments.sumOf { it.amountPaid }
                
                if (paidAmount < tenant.monthlyRent) {
                    showNotification(tenant.name, tenant.flatNumber)
                }
            }
        }

        return Result.success()
    }

    private fun showNotification(tenantName: String, flatNumber: String) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "rent_reminder_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Rent Reminders", NotificationManager.IMPORTANCE_DEFAULT)
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setContentTitle("Rent Due Soon!")
            .setContentText("Rent for $tenantName (Flat $flatNumber) is due in 3 days.")
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Replace with your app icon
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        notificationManager.notify(tenantName.hashCode(), notification)
    }
}
```

## 7. MainActivity

### `MainActivity.kt`
```kotlin
package com.example.rentflow

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModelProvider
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.example.rentflow.data.local.AppDatabase
import com.example.rentflow.data.repository.RentRepository
import com.example.rentflow.ui.RentFlowApp
import com.example.rentflow.ui.theme.RentFlowTheme
import com.example.rentflow.ui.viewmodel.AdminViewModel
import com.example.rentflow.ui.viewmodel.AdminViewModelFactory
import com.example.rentflow.ui.viewmodel.DashboardViewModel
import com.example.rentflow.ui.viewmodel.DashboardViewModelFactory
import com.example.rentflow.ui.viewmodel.TenantViewModel
import com.example.rentflow.ui.viewmodel.TenantViewModelFactory
import com.example.rentflow.worker.RentReminderWorker
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize Database and Repository
        val database = AppDatabase.getDatabase(this)
        val repository = RentRepository(database.tenantDao(), database.paymentDao())
        
        // Initialize ViewModels
        val dashboardViewModel = ViewModelProvider(this, DashboardViewModelFactory(repository))[DashboardViewModel::class.java]
        val tenantViewModel = ViewModelProvider(this, TenantViewModelFactory(repository))[TenantViewModel::class.java]
        val adminViewModel = ViewModelProvider(this, AdminViewModelFactory(repository))[AdminViewModel::class.java]

        // Setup WorkManager for daily reminders
        setupDailyReminders()

        setContent {
            RentFlowTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    RentFlowApp(dashboardViewModel, tenantViewModel, adminViewModel)
                }
            }
        }
    }

    private fun setupDailyReminders() {
        val workRequest = PeriodicWorkRequestBuilder<RentReminderWorker>(1, TimeUnit.DAYS)
            .build()
        
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "DailyRentReminder",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }
}
```
