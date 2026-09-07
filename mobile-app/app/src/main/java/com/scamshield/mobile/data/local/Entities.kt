package com.scamshield.mobile.data.local

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey
import androidx.room.Relation
import androidx.room.TypeConverter
import androidx.room.TypeConverters

@Entity(tableName = "scans")
data class ScanEntity(
    @PrimaryKey val id: String,
    val createdAt: String,
    val inputText: String,
    val translatedText: String?,
    val overallVerdict: String,
    @TypeConverters(StringListConverter::class) val reasonBullets: List<String>,
    val totalCostUsd: Double,
    val totalCalls: Int,
    val uniqueMinersUsed: Int,
    // Mobile-only metadata: ScanResult itself has no notion of an SMS sender.
    val senderNumber: String,
    val receivedAtEpochMs: Long,
)

@Entity(
    tableName = "miner_calls",
    foreignKeys = [
        ForeignKey(
            entity = ScanEntity::class,
            parentColumns = ["id"],
            childColumns = ["scanId"],
            onDelete = ForeignKey.CASCADE,
        )
    ],
    indices = [androidx.room.Index("scanId")],
)
data class MinerCallEntity(
    @PrimaryKey(autoGenerate = true) val rowId: Long = 0,
    val scanId: String,
    val minerId: String,
    val minerName: String,
    val category: String,
    val entityKind: String,
    val entity: String,
    val ok: Boolean,
    val verdictLabel: String?,
    val verdictConfidence: Double?,
    val verdictReason: String?,
    val costUsd: Double,
    val durationMs: Long,
    val error: String?,
)

data class ScanWithCalls(
    @Embedded val scan: ScanEntity,
    @Relation(parentColumn = "id", entityColumn = "scanId")
    val calls: List<MinerCallEntity>,
)

class StringListConverter {
    // Unit separator control character (code point 31) - won't appear in
    // ordinary reasonBullets text, used to flatten the list into one column.
    private val separator = 31.toChar().toString()

    @TypeConverter
    fun fromList(value: List<String>): String = value.joinToString(separator)

    @TypeConverter
    fun toList(value: String): List<String> = if (value.isEmpty()) emptyList() else value.split(separator)
}
