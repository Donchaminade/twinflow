package regulator

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/twinflow/twinflow/internal/config"
)

func TestWriteQueueShedsWhenFull(t *testing.T) {
	r := New(config.RegulatorConfig{
		RateLimitRPS:   1000,
		Burst:          1000,
		WriteQueueSize: 1,
		WriteTimeout:   time.Second,
		ReadTimeout:    time.Second,
	})
	started := make(chan struct{})
	release := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		_ = r.DoWrite(context.Background(), func(ctx context.Context) error {
			close(started)
			<-release
			return nil
		})
	}()
	<-started
	err := r.DoWrite(context.Background(), func(ctx context.Context) error { return nil })
	if err != ErrQueueFull {
		t.Fatalf("want queue full, got %v", err)
	}
	close(release)
	wg.Wait()
	if r.Stats().QueueDropped != 1 {
		t.Fatalf("dropped=%d", r.Stats().QueueDropped)
	}
}

func TestPrimaryReadTimesOut(t *testing.T) {
	r := New(config.RegulatorConfig{
		RateLimitRPS:   0.01,
		Burst:          1,
		WriteQueueSize: 4,
		WriteTimeout:   20 * time.Millisecond,
		ReadTimeout:    20 * time.Millisecond,
	})
	// consume the burst token
	_ = r.DoPrimaryRead(context.Background(), func(ctx context.Context) error { return nil })
	err := r.DoPrimaryRead(context.Background(), func(ctx context.Context) error { return nil })
	if err != ErrTimeout {
		t.Fatalf("want timeout, got %v", err)
	}
}

func TestConcurrentWritesStayBounded(t *testing.T) {
	r := New(config.RegulatorConfig{
		RateLimitRPS:   10_000,
		Burst:          10_000,
		WriteQueueSize: 8,
		WriteTimeout:   time.Second,
		ReadTimeout:    time.Second,
	})
	var inFlight atomic.Int32
	var max atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 40; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = r.DoWrite(context.Background(), func(ctx context.Context) error {
				n := inFlight.Add(1)
				for {
					cur := max.Load()
					if n <= cur || max.CompareAndSwap(cur, n) {
						break
					}
				}
				time.Sleep(5 * time.Millisecond)
				inFlight.Add(-1)
				return nil
			})
		}()
	}
	wg.Wait()
	if max.Load() > 8 {
		t.Fatalf("in-flight writes exceeded queue: %d", max.Load())
	}
}
