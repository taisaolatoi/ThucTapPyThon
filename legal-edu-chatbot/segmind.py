import base64
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import LoginForm, RegisterForm
from .models import Poster, Profile  # Thêm import này
import time
from googletrans import Translator
import requests
from PIL import Image, ImageDraw, ImageFont
import io
import os
from django.contrib.auth.decorators import login_required
import time
import cloudinary
import cloudinary.uploader

# Dịch prompt tiếng Việt sang tiếng Anh
def translate_prompt(viet_prompt):
    translator = Translator()
    eng_prompt = translator.translate(viet_prompt, dest='en').text
    return eng_prompt


# Gọi Stability.ai API để tạo hình ảnh
def generate_image_from_sdxl(prompt, style=None, engine_id="stable-diffusion-xl-1024-v1-0", cfg_scale=7, steps=30, seed=None, negative_prompt=None):
    # Thêm style vào prompt nếu có
    if style:
        prompt = f"{prompt}, style: {style}"
    
    # URL API của Stability.ai với engine_id động
    url = f"https://api.stability.ai/v1/generation/{engine_id}/text-to-image"
    
    # Headers với API key của bạn
    headers = {
        "Authorization": "Bearer sk-B9CFmb3zRqT0tMVyxpupZ3JHRVyl2QPxxltMxFJoHxyxSCSN",
        "Content-Type": "application/json",
        "Accept": "image/png"
    }
    
    # Chuẩn bị dữ liệu cho request dưới dạng JSON
    payload = {
        "text_prompts": [
            {
                "text": prompt,
                "weight": 1
            }
        ],
        "cfg_scale": cfg_scale,
        "height": 1024,
        "width": 1024,
        "samples": 1,
        "steps": steps
    }
    
    # Thêm seed nếu được cung cấp
    if seed is not None:
        payload["seed"] = seed
    
    # Thêm negative_prompt nếu được cung cấp
    if negative_prompt:
        payload["text_prompts"].append({
            "text": negative_prompt,
            "weight": -1
        })
    
    try:
        # Gửi request dưới dạng JSON
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            # Trả về đối tượng hình ảnh PIL từ dữ liệu PNG
            return Image.open(io.BytesIO(response.content))
        elif response.status_code == 402:
            # Xử lý lỗi hết credit
            raise Exception("API đã hết credit. Vui lòng kiểm tra tài khoản Stability.ai của bạn.")
        else:
            # Xử lý các lỗi khác
            raise Exception(f"Lỗi API: {response.status_code}, {response.text}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Lỗi kết nối: {str(e)}")

# Gọi Flux.1 Schnell API từ Segmind
def generate_image_from_flux(prompt, style=None):
    # Thêm style vào prompt nếu có
    if style:
        prompt = f"{prompt}, style: {style}"
        
    url = "https://api.segmind.com/v1/flux-schnell"
    headers = {"x-api-key": "SG_14bc7a830ba0adfc"}
    payload = {
        "prompt": prompt,
        "samples": 1,                # Số ảnh tạo
        "num_inference_steps": 25,   # Số bước xử lý
        "guidance_scale": 7.5,       # Độ tuân thủ prompt
        "img_width": 1024,           # Chiều rộng
        "img_height": 1024           # Chiều cao
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            return Image.open(io.BytesIO(response.content))
        elif response.status_code == 429:
            # Xử lý riêng cho lỗi 429 (Too Many Requests)
            raise Exception("API Flux đã đạt giới hạn yêu cầu. Vui lòng đợi 5 phút trước khi thử lại hoặc chọn model AI khác.")
        else:
            # Xử lý các lỗi khác
            raise Exception(f"Lỗi API Flux: {response.status_code}. Vui lòng thử lại sau hoặc chọn model AI khác.")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Lỗi kết nối Flux API: {str(e)}")

# Thêm chữ tiếng Việt lên ảnh (chưa hoàn thiện)
def add_vietnamese_text(image, text, position=(50, 50), font_size=40, color=(255, 255, 255)):
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    draw.text(position, text, font=font, fill=color)
    return image

# View chính
def index(request):
    if request.method == 'POST':
        viet_prompt = request.POST.get('prompt')
        viet_text = request.POST.get('text')
        style = request.POST.get('style', 'design')
        
        # Dịch prompt
        eng_prompt = translate_prompt(viet_prompt)
        
        # Tạo hình ảnh từ SDXL với style
        image = generate_image_from_sdxl(eng_prompt, style)
        
        # Bỏ phần thêm chữ tiếng Việt lên ảnh
        final_image = image
        
        # Lưu ảnh tạm thời
        output_path = os.path.join('static', 'output.png')
        final_image.save(output_path)
        
        # Lưu poster vào cơ sở dữ liệu
        from django.core.files.base import ContentFile
        import io
        
        # Chuyển đổi ảnh thành bytes
        img_io = io.BytesIO()
        final_image.save(img_io, format='PNG')
        img_content = ContentFile(img_io.getvalue())
        
        # Tạo poster mới
        poster = Poster(
            user=request.user,
            prompt=viet_prompt,
            text=viet_text,
            style=style
        )
        poster.image.save(f'poster_{request.user.id}_{int(time.time())}.png', img_content, save=True)
        
        # Hiển thị kết quả
        return render(request, 'poster_app/result.html', {
            'image_url': '/static/output.png',
            'prompt': viet_prompt,
            'text': viet_text,
            'style': style,
            'poster_id': poster.id,
        })
    
    return render(request, 'poster_app/index.html')


def login_view(request):
    if request.method == 'GET':
        form = LoginForm()
        return render(request, 'poster_app/login.html', {'form': form})
    
    elif request.method == 'POST':
        form = LoginForm(request.POST)
        
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                messages.success(request, f'Chào mừng {username}!')
                return redirect('index')
            else:
                messages.error(request, 'Tên đăng nhập hoặc mật khẩu không đúng.')
        
        return render(request, 'poster_app/login.html', {'form': form})

def register_view(request):
    if request.method == 'GET':
        form = RegisterForm()
        return render(request, 'poster_app/register.html', {'form': form})
    
    elif request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Đăng ký tài khoản thành công!')
            return redirect('index')
        
        return render(request, 'poster_app/register.html', {'form': form})

def logout_view(request):
    logout(request)
    messages.success(request, 'Đăng xuất thành công!')
    return redirect('login')


@login_required(login_url='login')
def history(request):
    posters = Poster.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'poster_app/history.html', {'posters': posters})

@login_required(login_url='login')
def poster_detail(request, poster_id):
    poster = get_object_or_404(Poster, id=poster_id, user=request.user)
    return render(request, 'poster_app/poster_detail.html', {'poster': poster})
@login_required(login_url='login')
def text2poster(request):
    error_message = None
    
    # Lấy danh sách model từ API
    available_models = get_available_engines()
    
    # Thêm model Flux vào danh sách
    available_models.append({"id": "flux-schnell", "name": "Flux.1 Schnell (Segmind)"}) 
    
    if request.method == 'POST':
        viet_prompt = request.POST.get('prompt')
        viet_text = request.POST.get('text')
        style = request.POST.get('style', 'design')
        engine_id = request.POST.get('engine_id', 'stable-diffusion-xl-1024-v1-0')
        
        try:
            # Dịch prompt
            eng_prompt = translate_prompt(viet_prompt)
            
            # Tạo hình ảnh dựa trên engine được chọn
            if engine_id == "flux-schnell":
                # Sử dụng API Flux
                image = generate_image_from_flux(eng_prompt, style)
            else:
                # Sử dụng API Stability.ai
                image = generate_image_from_sdxl(eng_prompt, style, engine_id)
            
            # Lưu ảnh tạm thời để hiển thị
            output_path = os.path.join('static', 'output.png')
            image.save(output_path)
            
            # Chuyển đổi ảnh thành bytes để lưu vào Cloudinary
            img_io = io.BytesIO()
            image.save(img_io, format='PNG')
            
            # Tạo poster mới
            poster = Poster(
                user=request.user,
                prompt=viet_prompt,
                text=viet_text,
                style=style
            )
            
            # Thay thế đoạn lưu poster.image.save bằng upload trực tiếp lên Cloudinary
            cloud_response = cloudinary.uploader.upload(
                img_io.getvalue(),
                folder="upload_img_poster",
                upload_preset="django_preset"
            )
            
            # In thông tin debug
            print(f"Cloudinary response: {cloud_response['secure_url']}")
            print(f"Is Cloudinary URL: {'cloudinary' in cloud_response['secure_url']}")
            
            # Lưu URL từ Cloudinary vào model
            poster.image_url = cloud_response['secure_url']  # Thay đổi từ poster.image thành poster.image_url
            poster.save()
            
            # Trả về text2poster.html
            return render(request, 'poster_app/text2poster.html', {
                'image_url': '/static/output.png',  # Hiển thị ảnh tạm thời
                'cloud_image_url': cloud_response['secure_url'],  # URL của ảnh trên Cloudinary
                'prompt': viet_prompt,
                'text': viet_text,
                'style': style,
                'poster_id': poster.id,
                'engine_id': engine_id,
                'poster': poster,  # Thêm đối tượng poster để hiển thị trong template
                'available_models': available_models  # Vẫn cần truyền danh sách models
            })
        except Exception as e:
            error_message = str(e)
    
    return render(request, 'poster_app/text2poster.html', {
        'error_message': error_message,
        'available_models': available_models
    })


# Lấy danh sách engine_id từ API
def get_available_engines():
    url = "https://api.stability.ai/v1/engines/list"
    
    headers = {
        "Authorization": "Bearer sk-B9CFmb3zRqT0tMVyxpupZ3JHRVyl2QPxxltMxFJoHxyxSCSN"
    }
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            engines = response.json()
            return engines
        else:
            # Nếu có lỗi, trả về danh sách mặc định
            return [
                {"id": "stable-diffusion-xl-1024-v1-0", "name": "Stable Diffusion XL v1.0"},
                {"id": "stable-diffusion-v1-6", "name": "Stable Diffusion v1.6"}
            ]
    except requests.exceptions.RequestException:
        # Nếu có lỗi kết nối, trả về danh sách mặc định
        return [
            {"id": "stable-diffusion-xl-1024-v1-0", "name": "Stable Diffusion XL v1.0"},
            {"id": "stable-diffusion-v1-6", "name": "Stable Diffusion v1.6"}
        ]
