document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');

    const today = new Date().toISOString().split('T')[0]; // 현재날짜

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        events: '/get_reservations',
        selectable: true,
        editable: true,
        eventContent: function(info) {
            // Custom rendering for event content
            const startTime = info.event.startStr.split('T')[1];
            const endTime = info.event.endStr.split('T')[1];
            const duration = calculateDuration(startTime, endTime);
            return {
                html: `
                    <div class="fc-event-time">(${duration})</div>
                    <div class="fc-event-title">${info.event.title}</div>
                `
            };
        },
        eventClick: function(info) {
            const popup = document.getElementById('reservation-popup');
            const form = document.getElementById('reservation-form');
            
            // Fill form with event data
            document.getElementById('event-id').value = info.event.id;
            document.getElementById('name').value = info.event.title;
            document.getElementById('date').value = info.event.startStr.split('T')[0];

            const startTime = info.event.startStr.split('T')[1];
            const endTime = info.event.endStr.split('T')[1];

            document.getElementById('start-time').value = formatTime(startTime);
            document.getElementById('end-time').value = formatTime(endTime);

            // const duration = calculateDuration(startTime, endTime);
            // document.getElementById('duration').textContent = `예약 시간: ${duration}`;
            updateDuration();

            document.getElementById('submit').style.display = 'none';
            document.getElementById('delete').style.display = 'inline';
            document.getElementById('update').style.display = 'inline';
            document.getElementById('delete').style.display = 'inline';
            document.getElementById('password').value = '';
            popup.classList.add('active');
        },
        dateClick: function(info) {
            if(info.dateStr < today) {
                if (document.querySelector('.popup').classList.contains('active')) {
                    document.querySelector('.popup').classList.remove('active'); // 팝업이 열려 있을 때 닫기
                }
                return;
            }
            const popup = document.getElementById('reservation-popup');
            const form = document.getElementById('reservation-form');
            
            // Fill form with default values
            document.getElementById('event-id').value = '';
            document.getElementById('name').value = "영웅";
            document.getElementById('date').value = info.dateStr;
            document.getElementById('start-time').value = '09:00'; // Default start time
            document.getElementById('end-time').value = '10:00'; // Default end time
            // document.getElementById('duration').value = '0H';
            updateDuration();

            document.getElementById('update').style.display = 'none';
            document.getElementById('delete').style.display = 'none';
            document.getElementById('password').value = '';
            popup.classList.add('active');
        },
        dayCellDidMount: function(info) {
            if(info.date.getTime() < new Date(today).getTime()) {
                info.el.classList.add('fc-day-past')
                info.el.style.pointerEvents = 'none';   // 날짜 클릭 비활성화
            }
        },
        datesSet: function() {
            if (document.querySelector('.popup').classList.contains('active')) {
                document.querySelector('.popup').classList.remove('active'); // 월 변경 시 팝업 닫기
            }
        }
    });

    calendar.render();

    // 예약하기 버튼
    document.getElementById('reservation-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);

        fetch('/reserve', {
            method: 'POST',
            body: formData
        }).then(response => {
            if (response.ok) {
                calendar.refetchEvents();
                document.querySelector('.popup').classList.remove('active');
            }
        });
    });

    // 취소하기 버튼
    document.getElementById('cancel').addEventListener('click', function() {
        document.querySelector('.popup').classList.remove('active');
    });

    // 수정하기 버튼(비번 검사)
    document.getElementById('update').addEventListener('click', function() {
        const formData = new FormData(document.getElementById('reservation-form'));
        fetch(`/edit_reservation/${formData.get('id')}`, {
            method: 'POST',
            body: formData
        }).then(response => {
            if (response.ok) {
                calendar.refetchEvents();
                document.querySelector('.popup').classList.remove('active');
            } else {
                alert('비밀번호가 올바르지 않습니다.');
            }
        });
    })

    // 삭제하기 버튼
    document.getElementById('delete').addEventListener('click', function() {
        const formData = new FormData(document.getElementById('reservation-form'));
        fetch(`/delete_reservation/${formData.get('id')}`, {
            method: 'POST',
            body: new URLSearchParams({ password: formData.get('password') })
        }).then(response => {
            if (response.ok) {
                calendar.refetchEvents();
                document.querySelector('.popup').classList.remove('active');
            } else {
                alert('비밀번호가 올바르지 않습니다.');
            }
        });
    });

    function calculateDuration(startTime, endTime) {
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const start = new Date();
        start.setHours(startHour, startMinute);

        const end = new Date();
        end.setHours(endHour, endMinute);

        const diffInMs = end - start;
        const diffInMinutes = diffInMs / (1000 * 60);
        const hours = Math.floor(diffInMinutes / 60);
        const minutes = Math.floor(diffInMinutes % 60);

        if(hours == 0)
            return `${minutes}m`;
        else if(minutes == 0)
            return `${hours}h`;
        else
            return `${hours}h ${minutes}m`;
    }

    function updateDuration() {
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const duration = calculateDuration(startTime, endTime);
        document.getElementById('duration').textContent = `예약시간: ${duration}`;
    }

    function adjustEndTime() {
        const startTime = document.getElementById('start-time').value;
        const endTimeInput = document.getElementById('end-time');
        if(!startTime) return;

        const [startHour, startMinute] = startTime.split(':').map(Number);

        const startDate = new Date();
        startDate.setHours(startHour, startMinute);

        // 최소 30분
        const minimumEndDate = new Date(startDate.getTime() + 30 * 60 * 1000);
        const minEndHour = minimumEndDate.getHours().toString().padStart(2, '0');
        const minEndMinute = minimumEndDate.getMinutes().toString().padStart(2, '0');

        const minEndTime = `${minEndHour}:${minEndMinute}`;

        console.log(minEndTime);
        if(endTimeInput.value <= minEndTime) {
            endTimeInput.value = minEndTime;
        }
    }

    function formatTime(timeStr) {
        if(!timeStr) {
            return '00:00';
        }
        // Extract time part (HH:MM:SS±HH:MM) and discard time zone info (±HH:MM)
        const timeParts = timeStr.split('+')[0];
        if (timeParts) {
            // Split at '+' or '-' to handle time zone offset and retain only HH:MM:SS
            return timeParts.split(/[\+\-]/)[0].split(':').slice(0, 2).join(':');
        }

        return '00:00'; // Default if timeStr is not properly formatted
    }

    // Time 선택 이벤트 발생 시, 수행할 함수
    document.getElementById('start-time').addEventListener('change', function() {
        adjustEndTime();
        updateDuration();
    });
    
    document.getElementById('end-time').addEventListener('change', function() {
        adjustEndTime();
        updateDuration();
    });
    
});
