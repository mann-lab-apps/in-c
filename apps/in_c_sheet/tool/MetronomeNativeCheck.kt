package com.mannlab.clef

private class FakeTrack : MetronomeClickTrack {
    val volumes = mutableListOf<Float>()
    var releases = 0
    var fail = false
    override fun restart(volume: Float) {
        check(!fail) { "Injected playback failure" }
        volumes.add(volume)
    }
    override fun release() { releases++ }
}

fun main() {
    val tracks = mutableListOf<FakeTrack>()
    val player = ClefMetronomePlayer { FakeTrack().also { tracks.add(it) } }
    player.playClick(false, 0.0)
    check(tracks.isEmpty())
    repeat(960) { index -> player.playClick(index % 4 == 0, 0.85) }
    check(tracks.size == 2)
    check(tracks[0].volumes.size == 720 && tracks[1].volumes.size == 240)
    player.playClick(false, 2.0)
    check(tracks[0].volumes.last() == 1f)
    check(runCatching { player.playClick(false, Double.NaN) }.isFailure)
    tracks[0].fail = true
    check(runCatching { player.playClick(false, 0.5) }.isFailure)
    check(tracks.all { it.releases == 1 })
    player.playClick(true, 0.3)
    check(tracks.size == 4 && tracks.last().volumes.single() == 0.3f)
    player.close()
    player.close()
    check(tracks.all { it.releases == 1 })
    check(runCatching { player.playClick(false, 1.0) }.isFailure)
    val partial = FakeTrack()
    var attempts = 0
    val failing = ClefMetronomePlayer {
        check(attempts++ == 0) { "Injected preload failure" }
        partial
    }
    check(runCatching { failing.playClick(false, 1.0) }.isFailure)
    check(partial.releases == 1 && partial.volumes.isEmpty())
    failing.close()
    for (accent in listOf(false, true)) {
        val samples = makeMetronomeClick(accent)
        check(samples.size == 1985)
        check(samples.first() == 0.toShort() && samples.last() == 0.toShort())
        check(samples.any { it > 0 } && samples.any { it < 0 })
        check(samples.all { kotlin.math.abs(it.toInt()) < 32767 })
    }
    println("PASS: cached clicks, gain, preload/play failure, retry, close, PCM bounds")
}
