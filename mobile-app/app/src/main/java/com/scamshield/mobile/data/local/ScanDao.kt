package com.scamshield.mobile.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface ScanDao {

    @Transaction
    suspend fun insertScanWithCalls(scan: ScanEntity, calls: List<MinerCallEntity>) {
        insertScan(scan)
        insertCalls(calls)
    }

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertScan(scan: ScanEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCalls(calls: List<MinerCallEntity>)

    @Query("SELECT * FROM scans ORDER BY receivedAtEpochMs DESC")
    fun getAllScansFlow(): Flow<List<ScanEntity>>

    @Transaction
    @Query("SELECT * FROM scans WHERE id = :id")
    fun getScanWithCalls(id: String): Flow<ScanWithCalls?>

    @Query("SELECT EXISTS(SELECT 1 FROM scans WHERE id = :id)")
    suspend fun hasScan(id: String): Boolean
}
