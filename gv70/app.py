from flask import Flask, render_template, request, redirect, url_for, jsonify
import sqlite3
from datetime import datetime, timedelta

app = Flask(__name__)

# 데이터베이스 초기화
def init_db():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reservation (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                password TEXT NOT NULL
            )
        ''')
        conn.commit()

init_db()

@app.route('/')
def index():
    today = datetime.today()
    next_month = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM reservation
            WHERE date >= ? AND date < ?
        ''', (today.date().isoformat(), next_month.date().isoformat()))
        reservations = cursor.fetchall()

    return render_template('index.html', today=today, reservations=reservations)

@app.route('/reserve', methods=['POST'])
def reserve():
    name = request.form['name']
    date = request.form['date']
    start_time = request.form['start_time']
    end_time = request.form['end_time']
    password = request.form['password']
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO reservation (name, date, start_time, end_time, password)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, date, start_time, end_time, password))
        conn.commit()
    
    return redirect(url_for('index'))

@app.route('/edit_reservation/<int:id>', methods=['POST'])
def edit_reservation(id):
    name = request.form['name']
    date = request.form['date']
    start_time = request.form['start_time']
    end_time = request.form['end_time']
    password = request.form['password']
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM reservation WHERE id = ?', (id,))
        result = cursor.fetchone()
        if result and result[0] == password:
            cursor.execute('''
                UPDATE reservation
                SET name = ?, date = ?, start_time = ?, end_time = ?
                WHERE id = ?
            ''', (name, date, start_time, end_time, id))
            conn.commit()
            return redirect(url_for('index'))
    
    return 'Invalid password', 403

@app.route('/delete_reservation/<int:id>', methods=['POST'])
def delete_reservation(id):
    password = request.form['password']
    
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM reservation WHERE id = ?', (id,))
        result = cursor.fetchone()
        if result and result[0] == password:
            cursor.execute('DELETE FROM reservation WHERE id = ?', (id,))
            conn.commit()
            return redirect(url_for('index'))
    
    return 'Invalid password', 403

@app.route('/get_reservations')
def get_reservations():
    with sqlite3.connect('database.db') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM reservation')
        reservations = cursor.fetchall()
        
    events = [{
        'id': r[0],
        'title': r[1],
        'start': r[2] + 'T' + r[3],
        'end': r[2] + 'T' + r[4],
        'created_at': r[5]
    } for r in reservations]
    return jsonify(events)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5200, debug=True)
